export async function readArchiveResponse(response) {
  // Some hosts set Content-Encoding and browsers already decompress .json.gz files.
  const bytes = new Uint8Array(await response.arrayBuffer());
  const text =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await new Response(
          new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
        ).text()
      : new TextDecoder().decode(bytes);
  const value = JSON.parse(text);
  if (
    value.schemaVersion !== 1 ||
    !Array.isArray(value.logs) ||
    !Array.isArray(value.replayActors) ||
    !Number.isFinite(Date.parse(value.updatedAt))
  )
    throw Error('Invalid archive');
  return value;
}
