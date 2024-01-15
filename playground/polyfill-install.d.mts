import type {
	Base64DecodingOptions,
	Base64EncodingOptions,
} from "./polyfill-core.d.mts";

declare global {
	interface Uint8Array {
		toBase64(options?: Base64EncodingOptions | undefined): string;
		toHex(): string;
	}

	interface Uint8ArrayConstructor {
		fromBase64(
			input: string,
			options?: Base64DecodingOptions | undefined,
		): Uint8Array;
		fromBase64Into(
			input: string,
			into?: Uint8Array | undefined,
			options?: Base64DecodingOptions | undefined,
		): { read: number; written: number };
		fromHex(input: string): Uint8Array;
		fromHexInto(
			input: string,
			into?: Uint8Array | undefined,
		): { read: number; written: number };
	}
}
