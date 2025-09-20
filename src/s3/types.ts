import * as z from 'zod';

const BucketAndKey = z.object({
  Bucket: z.string().min(1),
  Key: z.string().min(1),
});
type BucketAndKey = z.infer<typeof BucketAndKey>;

export const CreateSignedPostBody = BucketAndKey;
export type CreateSignedPostBody = BucketAndKey;

export const CreateSignedUrlBody = BucketAndKey;
export type CreateSignedUrlBody = BucketAndKey;

export const HeadObjectBody = BucketAndKey;
export type HeadObjectBody = BucketAndKey;

export const GetObjectBody = BucketAndKey;
export type GetObjectBody = BucketAndKey;

export const PutObjectBody = BucketAndKey;
export type PutObjectBody = BucketAndKey;

export const CopyObjectBody = z.object({
  CopySource: z.string().min(1),
  ...BucketAndKey.shape,
});
export type CopyObjectBody = z.infer<typeof CopyObjectBody>;

export const DeleteObjectBody = BucketAndKey;
export type DeleteObjectBody = BucketAndKey;
