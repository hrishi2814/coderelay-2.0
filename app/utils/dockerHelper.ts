/**
 * Decodes a Docker multiplexed stream buffer into clean strings.
 * @param buffer The raw buffer from docker.logs()
 */
export function decodeDockerStream(buffer: Buffer): { stdout: string; stderr: string } {
  let stdout = '';
  let stderr = '';
  let offset = 0;

  // Loop while there are still bytes to read
  while (offset < buffer.length) {
    // 1. Read the Stream Type (Byte 0)
    const type = buffer[offset]; 

    // 2. Read the Length (Bytes 4-7, Big Endian)
    // We skip bytes 1-3 (padding)
    const length = buffer.readUInt32BE(offset + 4);

    // 3. Move past the header (8 bytes)
    offset += 8;

    // 4. Read the actual message payload
    const payload = buffer.toString('utf-8', offset, offset + length);

    if (type === 1) {
      stdout += payload;
    } else if (type === 2) {
      stderr += payload;
    }

    // 5. Move offset to the start of the next frame
    offset += length;
  }

  return { stdout, stderr };
}