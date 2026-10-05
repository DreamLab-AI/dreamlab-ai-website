/**
 * Functions for handling markdown files
 */

/**
 * Extracts the headline and full details from a markdown text
 * @param markdown The markdown text to parse
 * @returns An object with headline and fullDetails properties
 */
export function parseTeamMarkdown(markdown: string) {
  // Extract the actual name/title (line after the # heading)
  const nameMatch = markdown.match(/# .*?\n\n(.*?)\n/);
  const headline = nameMatch ? nameMatch[1] : "";
  
  // Extract full details (everything after ## Full Details)
  const fullDetailsMatch = markdown.match(/## Full Details\n\n([\s\S]*)/);
  const fullDetails = fullDetailsMatch ? fullDetailsMatch[1] : "";
  
  return { headline, fullDetails };
}

/**
 * Returns the correct path for data files based on the environment
 * @param path Path starting with /src/data/ or /data/
 * @returns Correct path for the current environment
 */
export function getDataPath(path: string): string {
  // For production builds, use /data/ instead of /src/data/
  if (import.meta.env.PROD) {
    return path.replace(/^\/src\/data\//, '/data/');
  }
  return path;
}

/**
 * Fetches and parses a markdown file
 * @param path Path to the markdown file
 * @returns The parsed markdown content
 */
export async function fetchMarkdown(path: string) {
  try {
    const adjustedPath = getDataPath(path);
    const response = await fetch(adjustedPath);
    if (!response.ok) {
      console.error("Error fetching markdown: HTTP", response.status, "Path attempted:", adjustedPath);
      return "";
    }
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Error fetching markdown:", error, "Path attempted:", getDataPath(path));
    return "";
  }
} 