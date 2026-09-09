import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { grainApiRequest } from './GenericFunctions';

export class GrainTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grain Trigger',
		name: 'grainTrigger',
		icon: { light: 'file:grain.svg', dark: 'file:grain.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when a Grain event occurs (via webhook)',
		defaults: {
			name: 'Grain Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'grainApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The Grain events to subscribe to',
				options: [
					{ name: 'Highlight Added', value: 'highlight_added' },
					{ name: 'Highlight Deleted', value: 'highlight_deleted' },
					{ name: 'Highlight Updated', value: 'highlight_updated' },
					{ name: 'Recording Added', value: 'recording_added' },
					{ name: 'Recording Deleted', value: 'recording_deleted' },
					{ name: 'Recording Updated', value: 'recording_updated' },
					{ name: 'Story Added', value: 'story_added' },
					{ name: 'Story Deleted', value: 'story_deleted' },
					{ name: 'Story Updated', value: 'story_updated' },
					{ name: 'Upload Status', value: 'upload_status' },
				],
			},
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				default: [],
				description: 'Additional data to include in the webhook payloads',
				options: [
					{ name: 'AI Action Items', value: 'ai_action_items' },
					{ name: 'AI Summary', value: 'ai_summary' },
					{ name: 'Calendar Event', value: 'calendar_event' },
					{ name: 'Highlights', value: 'highlights' },
					{ name: 'Participants', value: 'participants' },
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return Array.isArray(webhookData.hookIds) && webhookData.hookIds.length > 0;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const include = this.getNodeParameter('include', []) as string[];
				const webhookData = this.getWorkflowStaticData('node');

				const hookIds: string[] = [];

				// Grain registers one webhook per event type, so create one per selected event.
				for (const event of events) {
					const body: IDataObject = {
						hook_url: webhookUrl,
						hook_type: event,
					};
					if (include.length) {
						body.include = include;
					}

					const response = (await grainApiRequest.call(
						this,
						'POST',
						'/_/public-api/v2/hooks/create',
						body,
					)) as IDataObject;

					if (response.id) {
						hookIds.push(response.id as string);
					}
				}

				if (hookIds.length === 0) {
					return false;
				}

				webhookData.hookIds = hookIds;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const hookIds = (webhookData.hookIds as string[]) ?? [];

				let success = true;
				for (const hookId of hookIds) {
					try {
						await grainApiRequest.call(this, 'DELETE', `/_/public-api/v2/hooks/${hookId}`);
					} catch (error) {
						// Deliberate: attempt every hook deletion before reporting failure, so one
						// unreachable hook does not leave the remaining ones registered in Grain.
						// Each failure is logged so the operator can clean it up manually.
						this.logger.error(`Grain Trigger: failed to delete hook ${hookId}`, {
							hookId,
							node: this.getNode().name,
							error: error as Error,
						});
						success = false;
					}
				}

				delete webhookData.hookIds;
				return success;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData as IDataObject)],
		};
	}
}
