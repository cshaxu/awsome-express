import * as z from 'zod';

export const StartDocumentTextDetectionBody = z.object({
  DocumentLocation: z.object({
    S3Object: z.object({ Bucket: z.string().min(1), Name: z.string().min(1) }),
  }),
});
export type StartDocumentTextDetectionBody = z.infer<
  typeof StartDocumentTextDetectionBody
>;

export const GetDocumentTextDetectionBody = z.object({
  JobId: z.string().min(1),
  NextToken: z.string().min(1).optional(),
});
export type GetDocumentTextDetectionBody = z.infer<
  typeof GetDocumentTextDetectionBody
>;
