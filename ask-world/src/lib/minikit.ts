// src/lib/minikit.ts
import { MiniKit } from "@worldcoin/minikit-js";

export const initMiniKit = () => {
  if (typeof window !== "undefined") {
    MiniKit.install();
    if (MiniKit.isInstalled()) {
      console.log("MiniKit is installed");
      return true;
    }
    console.log("MiniKit is not installed");
    return false;
  }
};
