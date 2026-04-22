import { authHandlers } from "@/lib/auth/options";

export async function GET(req: Request) {
	if (!authHandlers?.GET) {
		return Response.json(
			{
				error: "oauth_not_configured",
				message: "Configure Google/Facebook credentials to enable social login",
			},
			{ status: 503 },
		);
	}

	return authHandlers.GET(req);
}

export async function POST(req: Request) {
	if (!authHandlers?.POST) {
		return Response.json(
			{
				error: "oauth_not_configured",
				message: "Configure Google/Facebook credentials to enable social login",
			},
			{ status: 503 },
		);
	}

	return authHandlers.POST(req);
}
