import * as zlib from "zlib";

export enum TagType {
  End = 0,
  Byte = 1,
  Short = 2,
  Int = 3,
  Long = 4,
  Float = 5,
  Double = 6,
  ByteArray = 7,
  String = 8,
  List = 9,
  Compound = 10,
  IntArray = 11,
  LongArray = 12
}

export interface NBTTag {
  type: TagType;
  name: string;
  value: any;
}

export class NBTParser {
  private buffer: Buffer;
  private offset: number = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  public parse(): NBTTag {
    const type = this.readByte();
    if (type === TagType.End) {
      return { type: TagType.End, name: "", value: null };
    }
    const name = this.readString();
    const value = this.readTagValue(type);
    return { type, name, value };
  }

  private readByte(): number {
    const val = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return val;
  }

  private readShort(): number {
    const val = this.buffer.readInt16BE(this.offset);
    this.offset += 2;
    return val;
  }

  private readInt(): number {
    const val = this.buffer.readInt32BE(this.offset);
    this.offset += 4;
    return val;
  }

  private readLong(): bigint {
    const val = this.buffer.readBigInt64BE(this.offset);
    this.offset += 8;
    return val;
  }

  private readFloat(): number {
    const val = this.buffer.readFloatBE(this.offset);
    this.offset += 4;
    return val;
  }

  private readDouble(): number {
    const val = this.buffer.readDoubleBE(this.offset);
    this.offset += 8;
    return val;
  }

  private readString(): string {
    const length = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    const val = this.buffer.toString("utf-8", this.offset, this.offset + length);
    this.offset += length;
    return val;
  }

  private readTagValue(type: TagType): any {
    switch (type) {
      case TagType.Byte:
        return this.readByte();
      case TagType.Short:
        return this.readShort();
      case TagType.Int:
        return this.readInt();
      case TagType.Long:
        return this.readLong();
      case TagType.Float:
        return this.readFloat();
      case TagType.Double:
        return this.readDouble();
      case TagType.ByteArray: {
        const length = this.readInt();
        const data = this.buffer.subarray(this.offset, this.offset + length);
        this.offset += length;
        return Buffer.from(data);
      }
      case TagType.String:
        return this.readString();
      case TagType.List: {
        const itemType = this.readByte();
        const length = this.readInt();
        const list: any[] = [];
        for (let i = 0; i < length; i++) {
          list.push(this.readTagValue(itemType));
        }
        return { itemType, list };
      }
      case TagType.Compound: {
        const compound: Record<string, NBTTag> = {};
        while (true) {
          const innerType = this.readByte();
          if (innerType === TagType.End) break;
          const name = this.readString();
          const value = this.readTagValue(innerType);
          compound[name] = { type: innerType, name, value };
        }
        return compound;
      }
      case TagType.IntArray: {
        const length = this.readInt();
        const arr: number[] = [];
        for (let i = 0; i < length; i++) {
          arr.push(this.readInt());
        }
        return arr;
      }
      case TagType.LongArray: {
        const length = this.readInt();
        const arr: bigint[] = [];
        for (let i = 0; i < length; i++) {
          arr.push(this.readLong());
        }
        return arr;
      }
      default:
        throw new Error(`Unsupported NBT Tag Type: ${type} at offset ${this.offset}`);
    }
  }
}

export class NBTWriter {
  private buffers: Buffer[] = [];

  public write(tag: NBTTag): Buffer {
    this.writeByte(tag.type);
    if (tag.type === TagType.End) return Buffer.concat(this.buffers);
    this.writeString(tag.name);
    this.writeTagValue(tag.type, tag.value);
    return Buffer.concat(this.buffers);
  }

  private writeByte(val: number) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(val, 0);
    this.buffers.push(buf);
  }

  private writeShort(val: number) {
    const buf = Buffer.alloc(2);
    buf.writeInt16BE(val, 0);
    this.buffers.push(buf);
  }

  private writeInt(val: number) {
    const buf = Buffer.alloc(4);
    buf.writeInt32BE(val, 0);
    this.buffers.push(buf);
  }

  private writeLong(val: bigint | number) {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(val), 0);
    this.buffers.push(buf);
  }

  private writeFloat(val: number) {
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(val, 0);
    this.buffers.push(buf);
  }

  private writeDouble(val: number) {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(val, 0);
    this.buffers.push(buf);
  }

  private writeString(val: string) {
    const utf8 = Buffer.from(val, "utf-8");
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(utf8.length, 0);
    this.buffers.push(lenBuf, utf8);
  }

  private writeTagValue(type: TagType, value: any) {
    switch (type) {
      case TagType.Byte:
        this.writeByte(value);
        break;
      case TagType.Short:
        this.writeShort(value);
        break;
      case TagType.Int:
        this.writeInt(value);
        break;
      case TagType.Long:
        this.writeLong(value);
        break;
      case TagType.Float:
        this.writeFloat(value);
        break;
      case TagType.Double:
        this.writeDouble(value);
        break;
      case TagType.ByteArray: {
        const buf = value as Buffer;
        this.writeInt(buf.length);
        this.buffers.push(buf);
        break;
      }
      case TagType.String:
        this.writeString(value);
        break;
      case TagType.List: {
        const { itemType, list } = value as { itemType: TagType; list: any[] };
        this.writeByte(itemType);
        this.writeInt(list.length);
        for (const item of list) {
          this.writeTagValue(itemType, item);
        }
        break;
      }
      case TagType.Compound: {
        const compound = value as Record<string, NBTTag>;
        for (const [_, innerTag] of Object.entries(compound)) {
          this.writeByte(innerTag.type);
          this.writeString(innerTag.name);
          this.writeTagValue(innerTag.type, innerTag.value);
        }
        this.writeByte(TagType.End);
        break;
      }
      case TagType.IntArray: {
        const arr = value as number[];
        this.writeInt(arr.length);
        for (const val of arr) {
          this.writeInt(val);
        }
        break;
      }
      case TagType.LongArray: {
        const arr = value as (bigint | number)[];
        this.writeInt(arr.length);
        for (const val of arr) {
          this.writeLong(val);
        }
        break;
      }
      default:
        throw new Error(`Unsupported NBT Tag Type for writing: ${type}`);
    }
  }
}

/**
 * Reads a Gzipped or uncompressed NBT file from a buffer.
 */
export function readNBT(buffer: Buffer): Promise<NBTTag> {
  return new Promise((resolve, reject) => {
    // Check if buffer is Gzipped (starts with 0x1f, 0x8b)
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      zlib.gunzip(buffer, (err, decompressed) => {
        if (err) return reject(err);
        try {
          const parser = new NBTParser(decompressed);
          resolve(parser.parse());
        } catch (e) {
          reject(e);
        }
      });
    } else {
      try {
        const parser = new NBTParser(buffer);
        resolve(parser.parse());
      } catch (e) {
        reject(e);
      }
    }
  });
}

/**
 * Writes NBT data to a Gzipped or uncompressed buffer.
 */
export function writeNBT(tag: NBTTag, compress = true): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const writer = new NBTWriter();
      const uncompressed = writer.write(tag);
      if (compress) {
        zlib.gzip(uncompressed, (err, compressed) => {
          if (err) return reject(err);
          resolve(compressed);
        });
      } else {
        resolve(uncompressed);
      }
    } catch (e) {
      reject(e);
    }
  });
}
