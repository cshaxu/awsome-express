import { LOCAL_STORAGE_PATH } from '@/config.js';
import { generateCode } from '@/utils/token.js';
import {
  Block,
  DocumentLocation,
  GetDocumentTextDetectionCommandOutput,
  JobStatus,
  StartDocumentTextDetectionCommandOutput,
} from '@aws-sdk/client-textract';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';
import createHttpError from 'http-errors';
import path from 'path';
import { createWorker } from 'tesseract.js';

// 使用 pdf2json 进行 PDF 文本提取，支持逐页处理
import PDFParser from 'pdf2json';

// 扩展 AWS 类型以包含我们的自定义字段
export type TextractJob = {
  JobId: string;
  JobStatus: JobStatus;
  DocumentLocation: DocumentLocation;
  StartTime: Date;
  EndTime?: Date;
  Blocks?: Block[];
  ErrorMessage?: string;
};

const jobs: Map<string, TextractJob> = new Map();

async function startDocumentTextDetection(
  documentLocation: DocumentLocation,
): Promise<StartDocumentTextDetectionCommandOutput> {
  const { S3Object } = documentLocation;
  if (!S3Object) {
    throw createHttpError.BadRequest('Missing "S3Object"');
  }
  const { Bucket, Name } = S3Object;
  if (!Bucket || !Name) {
    throw createHttpError.BadRequest('Missing "Bucket" or "Name"');
  }
  const filePath = path.join(LOCAL_STORAGE_PATH, Bucket, Name);

  if (!fs.existsSync(filePath)) {
    throw createHttpError.NotFound(`File not found: "${Bucket}/${Name}"`);
  }
  const jobId = generateCode(10);

  const job: TextractJob = {
    JobId: jobId,
    JobStatus: 'IN_PROGRESS',
    DocumentLocation: documentLocation,
    StartTime: new Date(),
  };

  jobs.set(jobId, job);

  processDocumentAsync(jobId, filePath);

  return { JobId: jobId, $metadata: {} };
}

async function processDocumentAsync(
  jobId: string,
  filePath: string,
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    throw createHttpError.NotFound(`Job not found: ${jobId}`);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const fileType = await fileTypeFromBuffer(buffer);
    const ContentType = fileType?.mime ?? 'application/octet-stream';

    let blocks: Block[];

    switch (ContentType) {
      case 'application/pdf':
        blocks = await processPdfDocument(filePath);
        break;
      case 'image/jpeg':
      case 'image/png':
      case 'image/bmp':
      case 'image/tiff':
        blocks = await processImageDocument(filePath);
        break;
      default:
        throw createHttpError.UnsupportedMediaType(
          `Unsupported file type: ${ContentType}`,
        );
    }

    job.JobStatus = 'SUCCEEDED';
    job.EndTime = new Date();
    job.Blocks = blocks;
    console.log(
      `Job ${jobId} completed, extracted ${blocks.length} text blocks`,
    );
  } catch (error) {
    job.JobStatus = 'FAILED';
    job.EndTime = new Date();
    job.ErrorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Job ${jobId} failed:`, error);
  }
}

// 处理 PDF 文档
async function processPdfDocument(filePath: string): Promise<Block[]> {
  return new Promise((resolve, reject) => {
    const blocks: Block[] = [];
    let currentBlockId = 1;

    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // 获取PDF页面数据
        const pages = pdfData.Pages;
        const totalPages = pages?.length || 0;

        if (totalPages === 0) {
          reject(new Error('No pages found in PDF'));
          return;
        }

        // 逐页处理PDF
        pages.forEach((page: any, pageIndex: number) => {
          const pageNumber = pageIndex + 1;

          // 为每个页面创建PAGE块
          const pageBlock: Block = {
            BlockType: 'PAGE',
            Id: currentBlockId.toString(),
            Confidence: 95,
            Geometry: {
              BoundingBox: { Width: 1.0, Height: 1.0, Left: 0.0, Top: 0.0 },
            },
            Page: pageNumber,
          };
          blocks.push(pageBlock);
          currentBlockId++;

          // 提取页面文本内容
          let pageText = '';
          if (page.Texts && page.Texts.length > 0) {
            page.Texts.forEach((text: any) => {
              if (text.R && text.R.length > 0) {
                text.R.forEach((r: any) => {
                  if (r.T) {
                    pageText += decodeURIComponent(r.T);
                  }
                });
              }
            });
          }

          // 按照PDF的原始结构处理文本
          // 如果PDF本身就是一个大的文本块，我们就按原样处理
          const lines = pageText
            .split(/\n+/)
            .filter((line) => line.trim().length > 0);

          // 如果没有文本内容，创建一个默认的文本块
          if (lines.length === 0) {
            lines.push(`Page ${pageNumber} - No text content extracted`);
          }

          // 为每一行创建LINE块
          lines.forEach((lineText, lineIndex) => {
            if (lineText) {
              const lineBlock: Block = {
                BlockType: 'LINE',
                Id: currentBlockId.toString(),
                Confidence: 90,
                Text: lineText,
                Geometry: {
                  BoundingBox: {
                    Width: 0.9,
                    Height: 0.05,
                    Left: 0.05,
                    Top: (lineIndex * 0.05) % 1.0,
                  },
                },
                Page: pageNumber,
              };
              blocks.push(lineBlock);
              currentBlockId++;

              // 为每个单词创建WORD块
              const words = lineText.split(/\s+/);
              words.forEach((word: string, wordIndex: number) => {
                if (word) {
                  const wordBlock: Block = {
                    BlockType: 'WORD',
                    Id: currentBlockId.toString(),
                    Confidence: 85,
                    Text: word,
                    Geometry: {
                      BoundingBox: {
                        Width: word.length * 0.02,
                        Height: 0.04,
                        Left: 0.05 + wordIndex * 0.15,
                        Top: (lineIndex * 0.05) % 1.0,
                      },
                    },
                    Page: pageNumber,
                  };
                  blocks.push(wordBlock);
                  currentBlockId++;
                }
              });
            }
          });
        });

        resolve(blocks);
      } catch (error) {
        reject(error);
      }
    });

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(`PDF parsing error: ${errData.parserError}`));
    });

    // 开始解析PDF文件
    pdfParser.loadPDF(filePath);
  });
}

async function processImageDocument(filePath: string): Promise<Block[]> {
  const blocks: Block[] = [];

  const worker = await createWorker({
    logger: () => {},
  });
  await worker.loadLanguage('chi_sim+eng'); // 支持中文简体和英文
  await worker.initialize('chi_sim+eng');

  // 为整个图像创建一个 PAGE 块
  const pageBlock: Block = {
    BlockType: 'PAGE',
    Id: '1',
    Confidence: 95,
    Geometry: {
      BoundingBox: { Width: 1.0, Height: 1.0, Left: 0.0, Top: 0.0 },
    },
    Page: 1, // 图像文档只有一页
  };
  blocks.push(pageBlock);

  const { data } = await worker.recognize(filePath);
  const ocrData = data as any;

  let currentBlockId = 2; // 从2开始，因为PAGE块是1

  if (ocrData.lines && ocrData.lines.length > 0) {
    ocrData.lines.forEach((line: any, lineIndex: number) => {
      const lineBlock: Block = {
        BlockType: 'LINE',
        Id: currentBlockId.toString(),
        Confidence: Math.round(line.confidence),
        Text: line.text.trim(),
        Geometry: {
          BoundingBox: {
            Width: line.bbox.width / ocrData.width,
            Height: line.bbox.height / ocrData.height,
            Left: line.bbox.x0 / ocrData.width,
            Top: line.bbox.y0 / ocrData.height,
          },
        },
        Page: 1, // 图像文档只有一页
      };
      blocks.push(lineBlock);
      currentBlockId++;

      // 处理单词
      if (line.words && line.words.length > 0) {
        line.words.forEach((word: any, wordIndex: number) => {
          const wordBlock: Block = {
            BlockType: 'WORD',
            Id: currentBlockId.toString(),
            Confidence: Math.round(word.confidence),
            Text: word.text,
            Geometry: {
              BoundingBox: {
                Width: word.bbox.width / ocrData.width,
                Height: word.bbox.height / ocrData.height,
                Left: word.bbox.x0 / ocrData.width,
                Top: word.bbox.y0 / ocrData.height,
              },
            },
            Page: 1, // 图像文档只有一页
          };
          blocks.push(wordBlock);
          currentBlockId++;
        });
      }
    });
  }

  await worker.terminate();
  return blocks;
}

async function getDocumentTextDetection(
  jobId: string,
): Promise<GetDocumentTextDetectionCommandOutput> {
  const job = jobs.get(jobId);

  if (!job) {
    throw createHttpError.NotFound(`Job not found: ${jobId}`);
  }

  const result: GetDocumentTextDetectionCommandOutput = {
    JobStatus: job.JobStatus,
    $metadata: {},
  };

  if (job.JobStatus === 'SUCCEEDED') {
    result.Blocks = job.Blocks;
    result.StatusMessage = 'Job completed successfully';
    (job.Blocks ?? [])
      .filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text)
      .join('\n');
  } else if (job.JobStatus === 'FAILED') {
    result.StatusMessage = job.ErrorMessage;
    result.StatusMessage = 'Job failed';
  } else {
    result.StatusMessage = 'Job is still in progress';
  }

  return result;
}

function listJobs(): { Jobs: TextractJob[] } {
  return { Jobs: Array.from(jobs.values()) };
}

function cleanupExpiredJobs(maxAgeHours: number = 24): void {
  const now = new Date();
  const maxAge = maxAgeHours * 60 * 60 * 1000; // 转换为毫秒

  for (const [jobId, job] of jobs.entries()) {
    if (job.EndTime && now.getTime() - job.EndTime.getTime() > maxAge) {
      jobs.delete(jobId);
      console.log(`清理过期任务: ${jobId}`);
    }
  }
}

setInterval(
  () => {
    cleanupExpiredJobs();
  },
  60 * 60 * 1000,
);

const TextractService = {
  startDocumentTextDetection,
  getDocumentTextDetection,
  listJobs,
};

export default TextractService;
