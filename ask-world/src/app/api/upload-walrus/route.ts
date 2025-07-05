import { NextRequest, NextResponse } from "next/server";

const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as File;

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio blob provided" },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Walrus publisher
    const walrusRes = await fetch(`${PUBLISHER}/v1/blobs?epochs=3`, {
      method: "PUT",
      headers: {
        "Content-Type": audioBlob.type || "application/octet-stream",
      },
      body: uint8Array,
    });

    const walrusJson = await walrusRes.json();

    if (!walrusRes.ok) {
      return NextResponse.json(
        { error: walrusJson.error || "Failed to upload to Walrus" },
        { status: 500 }
      );
    }

    // Print the identifier in the logs
    const blobId =
      walrusJson?.newlyCreated?.blobObject?.blobId ||
      walrusJson?.alreadyCertified?.blobId;
    console.log("Audio uploaded to Walrus with blobId:", blobId);

    return NextResponse.json({
      success: true,
      blobId,
      walrus: walrusJson,
    });
  } catch (error) {
    console.error("Error uploading to Walrus:", error);
    return NextResponse.json(
      { error: "Failed to upload to Walrus: " + (error as Error).message },
      { status: 500 }
    );
  }
}
