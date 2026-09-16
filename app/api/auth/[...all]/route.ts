import { auth } from "@/lib/auth";

const handle = async (request: Request) => (await auth()).handler(request);

export { handle as GET, handle as POST };
