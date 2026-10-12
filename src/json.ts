import type { JsonObject, JsonValue } from '@companion-module/base'

/** Not a Date, Map, Buffer or other class instance. xml2js builds attribute objects, eg an enclosure, with no prototype */
function isPlainObject(value: object): value is Record<string, unknown> {
	const prototype: unknown = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

/**
 * Copies an object, keeping only what can be serialised as JSON. A property that can't be is left out, and an array
 * element replaced with null, as JSON.stringify would, so the indices of the rest still line up. Neither of these is
 * reported, as nothing is lost: undefined, which is left out, and a BigInt, which becomes its decimal string.
 * @returns the copy, and the dotted path of everything left out
 */
export function toJsonObject(value: Record<string, unknown>): { json: JsonObject; dropped: string[] } {
	const dropped: string[] = []
	// The objects on the path to the current one, to catch a reference back up the tree
	const ancestors = new Set<object>()

	function copy(value: unknown, path: string): JsonValue | undefined {
		switch (typeof value) {
			case 'undefined':
				return undefined
			case 'string':
			case 'number':
			case 'boolean':
				return value
			case 'bigint':
				// JSON has no BigInt, and a number could lose precision past 2^53
				return value.toString()
			case 'object':
				if (value === null) return null
				if (ancestors.has(value)) break
				if (Array.isArray(value)) {
					ancestors.add(value)
					const array = value.map((element, index) => copy(element, `${path}.${index}`) ?? null)
					ancestors.delete(value)
					return array
				}
				if (isPlainObject(value)) {
					ancestors.add(value)
					const object = copyProperties(value, path)
					ancestors.delete(value)
					return object
				}
				break
		}
		dropped.push(path)
		return undefined
	}

	function copyProperties(value: Record<string, unknown>, path: string): JsonObject {
		const object: JsonObject = {}
		for (const [key, property] of Object.entries(value)) {
			const copied = copy(property, path ? `${path}.${key}` : key)
			if (copied !== undefined) object[key] = copied
		}
		return object
	}

	ancestors.add(value)
	return { json: copyProperties(value, ''), dropped }
}
