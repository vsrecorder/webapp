import { NextResponse, NextRequest } from "next/server";

import { auth } from "@app/auth";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accessKeyId = process.env.SAKURA_OBJECTSTORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SAKURA_OBJECTSTORAGE_SECRET_ACCESS_KEY;
const endpoint = process.env.SAKURA_OBJECTSTORAGE_ENDPOINT;
const region = process.env.SAKURA_OBJECTSTORAGE_REGION;
const bucketName = process.env.SAKURA_OBJECTSTORAGE_BUCKET_NAME;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    const s3Client = new S3Client({
      region: region,
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });

    const buffer = Buffer.from(await image.arrayBuffer());

    const uploadImage: any = {
      Bucket: bucketName,
      Key: "images/users/" + image.name,
      Body: buffer,
      ContentType: image.type,
      ACL: "public-read",
    };

    const command = new PutObjectCommand(uploadImage);
    await s3Client.send(command);

    return new NextResponse(JSON.stringify({}));
  } catch (error) {
    throw error;
  }
}
