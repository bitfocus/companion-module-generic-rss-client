import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import Parser from 'rss-parser'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	#parser: Parser<any, any> = new Parser()
	rssResponse: any = {}
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
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateFeed().catch(() => {})
	}

	async updateFeed(feedURL: string = this.config.feed): Promise<void> {
		try {
			this.rssResponse = await this.#parser.parseURL(feedURL)
			this.log('info', JSON.stringify(this.rssResponse))
			this.updateVariableDefinitions()
			this.updateStatus(InstanceStatus.Ok)
		} catch (error) {
			if (error instanceof Error) {
				this.log('error', JSON.stringify(error))
			} else {
				this.log('error', String(error))
			}
			this.updateStatus(InstanceStatus.UnknownError)
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

runEntrypoint(ModuleInstance, UpgradeScripts)
