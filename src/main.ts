import { InstanceBase, InstanceStatus, type JsonObject, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbackSchema } from './feedbacks.js'
import { toJsonObject } from './json.js'
import Parser from 'rss-parser'

export type ModuleTypes = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionSchema
	feedbacks: FeedbackSchema
	variables: VariablesSchema
}

// rss-parser returns more than it declares, eg dc:creator and content:encoded on items, so the extra fields are unknown
type FeedParser = Parser<Record<string, unknown>, Record<string, unknown>>

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleTypes> {
	config!: ModuleConfig // Setup in init()
	#parser: FeedParser = new Parser()
	/** The feed as Companion can take it, with anything that cannot be sent as JSON left out. Unset until a fetch succeeds */
	rssResponse: JsonObject | undefined = undefined
	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Ok)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updateFeed().catch(() => {})
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', `destroy id: ${this.id} label :${this.label} pid:${process.pid}`)
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateFeed().catch(() => {})
	}

	/** Fetches the feed and sets the variables from it. Rejects, once it has logged why, if the fetch fails */
	async updateFeed(feedURL: string = this.config.feed): Promise<JsonObject> {
		try {
			// Returned from this local, not this.rssResponse, which an overlapping update can replace in the meantime
			const { json: feed, dropped } = toJsonObject(await this.#parser.parseURL(feedURL))
			if (dropped.length > 0) {
				this.log('warn', `Left out of the feed, as they cannot be sent to Companion as JSON: ${dropped.join(', ')}`)
			}
			this.rssResponse = feed
			this.log('debug', JSON.stringify(feed))
			this.updateVariableDefinitions()
			this.updateStatus(InstanceStatus.Ok)
			return feed
		} catch (error) {
			this.log('error', `Feed update failed: ${error instanceof Error ? error.message : String(error)}`)
			this.updateStatus(InstanceStatus.UnknownError)
			throw error
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}
