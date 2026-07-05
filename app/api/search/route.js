import { searchCompanies } from "../../../lib/financialData";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchCompanies(query.trim());
    return Response.json({ results });
  } catch (err) {
    console.error(err);
    return Response.json({ results: [] });
  }
}
