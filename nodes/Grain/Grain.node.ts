import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	grainApiRequest,
	grainApiRequestAllItems,
	grainApiRequestText,
} from './GenericFunctions';

const INCLUDE_OPTIONS = [
	{ name: 'AI Action Items', value: 'ai_action_items' },
	{ name: 'AI Summary', value: 'ai_summary' },
	{ name: 'Calendar Event', value: 'calendar_event' },
	{ name: 'Highlights', value: 'highlights' },
	{ name: 'Participants', value: 'participants' },
	{ name: 'Screenshares', value: 'screenshares' },
];

export class Grain implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grain',
		name: 'grain',
		icon: { light: 'file:grain.svg', dark: 'file:grain.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Grain recordings, transcripts, users and teams',
		usableAsTool: true,
		defaults: {
			name: 'Grain',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'grainApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Recording', value: 'recording' },
					{ name: 'User', value: 'user' },
					{ name: 'Team', value: 'team' },
					{ name: 'Meeting Type', value: 'meetingType' },
				],
				default: 'recording',
			},

			// ----------------------------------
			//            recording
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: { resource: ['recording'] },
				},
				options: [
					{
						name: 'Add Tag',
						value: 'addTag',
						action: 'Add a tag to a recording',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a recording',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many recordings',
					},
					{
						name: 'Get Transcript',
						value: 'getTranscript',
						action: 'Get the transcript of a recording',
					},
					{
						name: 'Remove Tag',
						value: 'removeTag',
						action: 'Remove a tag from a recording',
					},
					{
						name: 'Share With User',
						value: 'shareWithUser',
						action: 'Share a recording with a user',
					},
					{
						name: 'Unshare From User',
						value: 'unshareFromUser',
						action: 'Unshare a recording from a user',
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update a recording',
					},
				],
				default: 'getAll',
			},

			// recordingId — used by most recording operations
			{
				displayName: 'Recording ID',
				name: 'recordingId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['recording'],
						operation: [
							'get',
							'getTranscript',
							'update',
							'addTag',
							'removeTag',
							'shareWithUser',
							'unshareFromUser',
						],
					},
				},
				description: 'The ID of the recording',
			},

			// recording:getAll
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: { resource: ['recording'], operation: ['getAll'] },
				},
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				displayOptions: {
					show: { resource: ['recording'], operation: ['getAll'], returnAll: [false] },
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: { resource: ['recording'], operation: ['getAll'] },
				},
				options: [
					{
						displayName: 'Meeting Type ID',
						name: 'meeting_type',
						type: 'string',
						default: '',
						description: 'Only return recordings of this meeting type',
					},
					{
						displayName: 'Participant Scope',
						name: 'participant_scope',
						type: 'options',
						options: [
							{ name: 'External', value: 'external' },
							{ name: 'Internal', value: 'internal' },
						],
						default: 'internal',
						description: 'Filter by whether the meeting had internal-only or external participants',
					},
					{
						displayName: 'Recorded After',
						name: 'after_datetime',
						type: 'dateTime',
						default: '',
						description: 'Only return recordings that started after this date/time',
					},
					{
						displayName: 'Recorded Before',
						name: 'before_datetime',
						type: 'dateTime',
						default: '',
						description: 'Only return recordings that started before this date/time',
					},
					{
						displayName: 'Team ID',
						name: 'team',
						type: 'string',
						default: '',
						description: 'Only return recordings shared with this team',
					},
					{
						displayName: 'Title Search',
						name: 'title_search',
						type: 'string',
						default: '',
						description: 'Only return recordings whose title matches this search term',
					},
				],
			},

			// include — for get / getAll
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				default: [],
				options: INCLUDE_OPTIONS,
				displayOptions: {
					show: { resource: ['recording'], operation: ['get', 'getAll'] },
				},
				description: 'Additional data to include in each recording',
			},

			// recording:getTranscript
			{
				displayName: 'Format',
				name: 'transcriptFormat',
				type: 'options',
				default: 'json',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'Plain Text', value: 'txt' },
					{ name: 'VTT', value: 'vtt' },
					{ name: 'SRT', value: 'srt' },
				],
				displayOptions: {
					show: { resource: ['recording'], operation: ['getTranscript'] },
				},
				description: 'The format in which to return the transcript',
			},

			// recording:update
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['recording'], operation: ['update'] },
				},
				description: 'The new title for the recording',
			},

			// recording:addTag / removeTag
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['recording'], operation: ['addTag', 'removeTag'] },
				},
				description: 'The tag to add or remove (alphanumeric characters and dashes)',
			},

			// recording:shareWithUser / unshareFromUser
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['recording'], operation: ['shareWithUser', 'unshareFromUser'] },
				},
				description: 'The ID of the user to share with or unshare from',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | string;

				if (resource === 'recording') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						const include = this.getNodeParameter('include', i, []) as string[];

						const body: IDataObject = {};
						if (Object.keys(filters).length) {
							body.filter = filters;
						}
						if (include.length) {
							body.include = include;
						}

						if (returnAll) {
							responseData = await grainApiRequestAllItems.call(
								this,
								'recordings',
								'POST',
								'/_/public-api/v2/recordings',
								body,
							);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const response = (await grainApiRequest.call(
								this,
								'POST',
								'/_/public-api/v2/recordings',
								body,
							)) as IDataObject;
							responseData = ((response.recordings as IDataObject[]) ?? []).slice(0, limit);
						}
					} else if (operation === 'get') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const include = this.getNodeParameter('include', i, []) as string[];
						const body: IDataObject = {};
						if (include.length) {
							body.include = include;
						}
						responseData = (await grainApiRequest.call(
							this,
							'POST',
							`/_/public-api/v2/recordings/${recordingId}`,
							body,
						)) as IDataObject;
					} else if (operation === 'getTranscript') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const format = this.getNodeParameter('transcriptFormat', i) as string;

						if (format === 'json') {
							responseData = (await grainApiRequest.call(
								this,
								'GET',
								`/_/public-api/v2/recordings/${recordingId}/transcript`,
							)) as IDataObject;
						} else {
							const text = await grainApiRequestText.call(
								this,
								'GET',
								`/_/public-api/v2/recordings/${recordingId}/transcript.${format}`,
							);
							responseData = { format, transcript: text };
						}
					} else if (operation === 'update') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						responseData = (await grainApiRequest.call(
							this,
							'PATCH',
							`/_/public-api/v2/recordings/${recordingId}`,
							{ title },
						)) as IDataObject;
					} else if (operation === 'addTag') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const tag = this.getNodeParameter('tag', i) as string;
						responseData = (await grainApiRequest.call(
							this,
							'PUT',
							`/_/public-api/v2/recordings/${recordingId}/tags`,
							{ tag },
						)) as IDataObject;
					} else if (operation === 'removeTag') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const tag = this.getNodeParameter('tag', i) as string;
						responseData = (await grainApiRequest.call(
							this,
							'DELETE',
							`/_/public-api/v2/recordings/${recordingId}/tags/${encodeURIComponent(tag)}`,
						)) as IDataObject;
					} else if (operation === 'shareWithUser') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = (await grainApiRequest.call(
							this,
							'PUT',
							`/_/public-api/v2/recordings/${recordingId}/users`,
							{ user_id: userId },
						)) as IDataObject;
					} else if (operation === 'unshareFromUser') {
						const recordingId = this.getNodeParameter('recordingId', i) as string;
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = (await grainApiRequest.call(
							this,
							'DELETE',
							`/_/public-api/v2/recordings/${recordingId}/users/${userId}`,
						)) as IDataObject;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"`,
						);
					}
				} else if (resource === 'user') {
					// user:getAll
					const response = (await grainApiRequest.call(
						this,
						'POST',
						'/_/public-api/v2/users',
					)) as IDataObject;
					responseData = (response.users as IDataObject[]) ?? [];
				} else if (resource === 'team') {
					// team:getAll
					const response = (await grainApiRequest.call(
						this,
						'POST',
						'/_/public-api/v2/teams',
					)) as IDataObject;
					responseData = (response.teams as IDataObject[]) ?? [];
				} else if (resource === 'meetingType') {
					// meetingType:getAll
					const response = (await grainApiRequest.call(
						this,
						'POST',
						'/_/public-api/v2/meeting_types',
					)) as IDataObject;
					responseData = (response.meeting_types as IDataObject[]) ?? [];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported`,
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
