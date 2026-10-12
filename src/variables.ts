import type { CompanionVariableDefinitions, CompanionVariableValues } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { flatten } from 'flat'

// Variables are built from whatever keys the feed holds, so there is no fixed schema to declare
export type VariablesSchema = CompanionVariableValues

export const sanitiseVariableId = (id: string, substitute: '' | '.' | '-' | '_' = '_'): string =>
	id.replaceAll(/[^a-zA-Z0-9-_.]/gm, substitute)

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	// flatten's return type is whatever the caller asks for. It only moves the input's values, never makes new ones,
	// and rssResponse holds nothing that can't be sent as JSON, so every value it gives back is a valid variable value
	const flattenedRssFeed: CompanionVariableValues = flatten(self.rssResponse ?? {})
	const varDefs: CompanionVariableDefinitions<VariablesSchema> = {}
	const varValues: VariablesSchema = {}
	for (const [key, value] of Object.entries(flattenedRssFeed)) {
		const variableId = sanitiseVariableId(key)
		varDefs[variableId] = { name: key }
		varValues[variableId] = value
	}
	self.setVariableDefinitions(varDefs)
	self.setVariableValues(varValues)
}
