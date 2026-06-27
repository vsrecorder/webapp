import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accessKeyId = process.env.SAKURA_OBJECTSTORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SAKURA_OBJECTSTORAGE_SECRET_ACCESS_KEY;
const endpoint = process.env.SAKURA_OBJECTSTORAGE_ENDPOINT;
const region = process.env.SAKURA_OBJECTSTORAGE_REGION;
const bucketName = process.env.SAKURA_OBJECTSTORAGE_BUCKET_NAME;
const cdnUrl = process.env.SAKURA_OBJECTSTORAGE_CDN_URL;

function buildDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.id !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    const datetime = buildDatetimeString(new Date());
    const filename = `${id}_${datetime}.png`;
    const key = `images/users/${filename}`;

    const s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });

    const buffer = Buffer.from(await image.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      ACL: "public-read",
    } as any);

    await s3Client.send(command);

    const imageUrl = `${cdnUrl}/${key}`;

    return NextResponse.json({ url: imageUrl }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
