import type { NextConfig } from "next";
import { setDefaultResultOrder } from "dns";

setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
