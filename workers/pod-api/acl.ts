/**
 * JSON-LD WAC (Web Access Control) evaluator
 * Evaluates ACL documents stored as JSON-LD against incoming requests.
 * Zero external dependencies — uses JSON.parse() instead of RDF libraries.
 *
 * @see https://solid.github.io/web-access-control-spec/
 */

export type AccessMode = 'Read' | 'Write' | 'Append' | 'Control';

interface AclAuthorization {
  '@id'?: string;
  '@type'?: string;
  'acl:agent'?: { '@id': string } | Array<{ '@id': string }>;
  'acl:agentClass'?: { '@id': string } | Array<{ '@id': string }>;
  'acl:accessTo'?: { '@id': string } | Array<{ '@id': string }>;
  'acl:default'?: { '@id': string } | Array<{ '@id': string }>;
  'acl:mode'?: { '@id': string } | Array<{ '@id': string }>;
}

interface AclDocument {
  '@context'?: Record<string, string>;
  '@graph'?: AclAuthorization[];
}

const MODE_MAP: Record<string, AccessMode[]> = {
  'acl:Read': ['Read'],
  'http://www.w3.org/ns/auth/acl#Read': ['Read'],
  'acl:Write': ['Write', 'Append'],
  'http://www.w3.org/ns/auth/acl#Write': ['Write', 'Append'],
  'acl:Append': ['Append'],
  'http://www.w3.org/ns/auth/acl#Append': ['Append'],
  'acl:Control': ['Control'],
  'http://www.w3.org/ns/auth/acl#Control': ['Control'],
};

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

function getIds(val: { '@id': string } | Array<{ '@id': string }> | undefined): string[] {
  return toArray(val).map(v => v['@id']).filter(Boolean);
}

function normalizePath(path: string): string {
  // Handle relative paths (e.g., "./" or "./profile/") by converting to absolute
  let normalized = path.replace(/^\.\//, '/').replace(/^\./, '/');
  normalized = normalized.replace(/\/+$/, '') || '/';
  return normalized;
}

function pathMatches(rulePath: string, resourcePath: string, isDefault: boolean): boolean {
  const normalizedRule = normalizePath(rulePath);
  const normalizedResource = normalizePath(resourcePath);

  if (!isDefault) {
    // accessTo: exact match or the resource is under the specified container
    return normalizedResource === normalizedRule ||
           normalizedResource.startsWith(normalizedRule + '/');
  }

  // default: applies to children of the container
  return normalizedResource.startsWith(normalizedRule + '/') ||
         normalizedResource === normalizedRule;
}

function getModes(auth: AclAuthorization): AccessMode[] {
  const modes: AccessMode[] = [];
  const modeRefs = getIds(auth['acl:mode'] as any);

  for (const ref of modeRefs) {
    const mapped = MODE_MAP[ref];
    if (mapped) modes.push(...mapped);
  }

  return modes;
}

function agentMatches(
  auth: AclAuthorization,
  agentUri: string | null,
): boolean {
  // Check specific agent match
  const agents = getIds(auth['acl:agent'] as any);
  if (agentUri && agents.includes(agentUri)) return true;

  // Check agent class
  const classes = getIds(auth['acl:agentClass'] as any);
  for (const cls of classes) {
    // foaf:Agent matches everyone (public access)
    if (cls === 'foaf:Agent' || cls === 'http://xmlns.com/foaf/0.1/Agent') return true;

    // acl:AuthenticatedAgent matches any authenticated user
    if (agentUri && (cls === 'acl:AuthenticatedAgent' ||
        cls === 'http://www.w3.org/ns/auth/acl#AuthenticatedAgent')) return true;
  }

  return false;
}

/**
 * Evaluate whether access should be granted based on the ACL document.
 *
 * @param aclDoc - Parsed JSON-LD ACL document (or null for no ACL)
 * @param agentUri - The requesting agent's URI (e.g., "did:nostr:{pubkey}") or null for anonymous
 * @param resourcePath - The resource path being accessed (e.g., "/profile/card")
 * @param requiredMode - The access mode required for the operation
 * @returns true if access is granted
 */
export function evaluateAccess(
  aclDoc: AclDocument | null,
  agentUri: string | null,
  resourcePath: string,
  requiredMode: AccessMode,
): boolean {
  // No ACL document = deny all (secure by default)
  if (!aclDoc || !aclDoc['@graph']) return false;

  for (const auth of aclDoc['@graph']) {
    // Check if this authorization grants the required mode
    const grantedModes = getModes(auth);
    if (!grantedModes.includes(requiredMode)) continue;

    // Check if the agent matches
    if (!agentMatches(auth, agentUri)) continue;

    // Check if the resource path matches
    const accessTo = getIds(auth['acl:accessTo'] as any);
    const defaults = getIds(auth['acl:default'] as any);

    for (const target of accessTo) {
      if (pathMatches(target, resourcePath, false)) return true;
    }

    for (const target of defaults) {
      if (pathMatches(target, resourcePath, true)) return true;
    }
  }

  return false;
}
