const BITS_PER_BYTE = 8,
  BITS_PER_VARINT_BYTE = 7,
  U8_BYTES = 1,
  U16_BYTES = 2,
  U32_BYTES = 4,
  U64_BYTES = 8,
  U128_BYTES = 16;
const de_zig_zag_signed = (n) => (n >> 1n) ^ -(n & 0b1n);
const zig_zag = (n_bytes, n) =>
  (n << 1n) ^ (n >> BigInt(n_bytes * BITS_PER_BYTE - 1));
const varint_max = (n_bytes) =>
  Math.floor(
    (n_bytes * BITS_PER_BYTE + (BITS_PER_BYTE - 1)) / BITS_PER_VARINT_BYTE,
  );
const max_of_last_byte = (n_bytes) =>
  (1 << ((n_bytes * BITS_PER_BYTE) % 7)) - 1;
const to_number_if_safe = (n) =>
  Number.MAX_SAFE_INTEGER < (n < 0n ? -n : n) ? n : Number(n);
const varint = (n_bytes, n) => {
  let value = BigInt(n),
    out = [];
  for (let i = 0; i < varint_max(n_bytes); i++) {
    out.push(Number(value & 0xffn));
    if (value < 128n) {
      return out;
    }
    out[i] |= 0x80;
    value >>= 7n;
  }
};

class Deserializer {
  constructor(bytes_in) {
    this.bytes = Array.from(bytes_in);
  }
  pop_next = () => {
    const next = this.bytes.shift();
    if (next === undefined) {
      throw "input buffer too small";
    }
    return next;
  };
  pop_n = (n) => {
    const bytes = [];
    for (let i = 0; i < n; i++) {
      bytes.push(this.bytes.shift());
    }
    return bytes;
  };
  get_int8 = (signed) =>
    signed ? new Int8Array([this.pop_next()])[0] : this.pop_next();
  try_take = (n_bytes) => {
    let out = 0n,
      v_max = varint_max(n_bytes);
    for (let i = 0; i < v_max; i++) {
      const val = this.pop_next(),
        carry = BigInt(val & 0x7f);
      out |= carry << BigInt(7 * i);
      if ((val & 0x80) === 0) {
        if (i === v_max - 1 && val > max_of_last_byte(n_bytes)) {
          throw "Bad Variant";
        } else return out;
      }
    }
    throw "Bad Variant";
  };
  deserialize_bool = () => {
    const byte = this.pop_next();
    return byte === undefined ? undefined : byte > 0 ? true : false;
  };
  deserialize_number = (n_bytes, signed) => {
    if (n_bytes === U8_BYTES) {
      return this.get_int8(signed);
    } else if (
      n_bytes === U16_BYTES ||
      n_bytes === U32_BYTES ||
      n_bytes === U64_BYTES ||
      n_bytes === U128_BYTES
    ) {
      const val = this.try_take(n_bytes);
      return to_number_if_safe(signed ? de_zig_zag_signed(val) : val);
    } else {
      throw "byte count not supported";
    }
  };
  deserialize_number_float = (n_bytes) => {
    const b_buffer = new ArrayBuffer(n_bytes),
      b_view = new DataView(b_buffer);
    this.pop_n(n_bytes).forEach((b, i) => b_view.setUint8(i, b));
    if (n_bytes === U32_BYTES) {
      return b_view.getFloat32(0, true);
    } else if (n_bytes === U64_BYTES) {
      return b_view.getFloat64(0, true);
    } else {
      throw "byte count not supported";
    }
  };
  deserialize_string = () => {
    const str = this.pop_n(Number(this.try_take(U32_BYTES)));
    return String.fromCharCode(...str);
  };
  deserialize_array = (des, len) =>
    Array.from(
      { length: len === undefined ? Number(this.try_take(U32_BYTES)) : len },
      (v, i) => des(this),
    );
  deserialize_string_key_map = (des) => {
    return [...Array(Number(this.try_take(U32_BYTES)))].reduce((prev) => {
      prev[this.deserialize_string()] = des(this);
      return prev;
    }, {});
  };
  deserialize_map = (des) => {
    return [...Array(Number(this.try_take(U32_BYTES)))].reduce((prev) => {
      const d = des(this);
      prev.set(d[0], d[1]);
      return prev;
    }, new Map());
  };
  release_bytes = () => {
    return new Uint8Array(this.bytes);
  };
}

function deserialize_MEASUREMENTS(d) {
  return {
    timestamps: d.deserialize_array(() =>
      d.deserialize_number(U64_BYTES, true),
    ),
    values: d.deserialize_array(() => d.deserialize_number(U16_BYTES, false)),
    has_more: d.deserialize_bool(),
  };
}

/**
 * Deserialize a value from an array of bytes.
 * @param {string} type - The type of the value to deserialize.
 * @param {Uint8Array} bytes - The byte array to deserialize from.
 * @return {Object} The deserialized value and remaining bytes.
 */ function deserialize(type, bytes) {
  if (!(typeof type === "string")) {
    throw "type must be a string";
  }
  const d = new Deserializer(bytes);
  var return_value;
  switch (type) {
    case "Measurements":
      return_value = deserialize_MEASUREMENTS(d);
      break;
    default:
      throw "type not implemented";
  }
  return { value: return_value, bytes: d.release_bytes() };
}

export { deserialize };
