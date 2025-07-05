import { NextRequest, NextResponse } from "next/server";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/sui/utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio blob provided" },
        { status: 400 }
      );
    }

    // Convert blob to Uint8Array
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Initialize Walrus client with fan-out proxy
    const suiClient = new SuiClient({
      url: getFullnodeUrl("testnet"),
      network: "testnet",
    }).$extend(
      WalrusClient.experimental_asClientExtension({
        fanOut: {
          host: "https://fan-out.testnet.walrus.space",
          sendTip: {
            max: 1_000,
          },
        },
      })
    );

    // Use a real Sui keypair as signer
    // const privateKey = process.env.SUI_PRIVATE_KEY!;
    const privateKey = "cixQDTswNJCcWkigndtmaqU23Myv+dU8x1+/YCkofXk=";
    const keypair = Ed25519Keypair.fromSecretKey(fromB64(privateKey));

    // Write blob to Walrus
    const { blobId } = await suiClient.walrus.writeBlob({
      blob: uint8Array,
      deletable: false,
      epochs: 3,
      signer: keypair,
    });

    console.log("Audio uploaded to Walrus with blobId:", blobId);

    return NextResponse.json({
      success: true,
      blobId: blobId,
      message: "Audio uploaded successfully to Walrus",
    });
  } catch (error) {
    console.error("Error uploading to Walrus:", error);
    return NextResponse.json(
      {
        error: "Failed to upload to Walrus: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
