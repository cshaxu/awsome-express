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
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

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
  const blocks: Block[] = [];

  // 读取 PDF 文件
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(pdfBuffer);

  // 为整个文档创建一个 PAGE 块
  const pageBlock: Block = {
    BlockType: 'PAGE',
    Id: '1',
    Confidence: 95,
    Geometry: {
      BoundingBox: { Width: 1.0, Height: 1.0, Left: 0.0, Top: 0.0 },
    },
  };
  blocks.push(pageBlock);

  // 将 PDF 文本按行分割
  const lines = pdfData.text
    .split('\n')
    .filter((line) => line.trim().length > 0);

  lines.forEach((line: string, lineIndex: number) => {
    const lineBlock: Block = {
      BlockType: 'LINE',
      Id: `${lineIndex + 2}`,
      Confidence: 90,
      Text: line.trim(),
      Geometry: {
        BoundingBox: {
          Width: 0.9,
          Height: 0.05,
          Left: 0.05,
          Top: (lineIndex * 0.05) % 1.0,
        },
      },
    };
    blocks.push(lineBlock);

    // 将行按单词分割
    const words = line.trim().split(/\s+/);
    words.forEach((word: string, wordIndex: number) => {
      const wordBlock: Block = {
        BlockType: 'WORD',
        Id: `${lineIndex + 2}-${wordIndex + 1}`,
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
      };
      blocks.push(wordBlock);
    });
  });

  return blocks;
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
  };
  blocks.push(pageBlock);

  const { data } = await worker.recognize(filePath);
  const ocrData = data as any;

  if (ocrData.lines && ocrData.lines.length > 0) {
    ocrData.lines.forEach((line: any, lineIndex: number) => {
      const lineBlock: Block = {
        BlockType: 'LINE',
        Id: `${lineIndex + 2}`,
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
      };
      blocks.push(lineBlock);

      // 处理单词
      if (line.words && line.words.length > 0) {
        line.words.forEach((word: any, wordIndex: number) => {
          const wordBlock: Block = {
            BlockType: 'WORD',
            Id: `${lineIndex + 2}-${wordIndex + 1}`,
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
          };
          blocks.push(wordBlock);
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
