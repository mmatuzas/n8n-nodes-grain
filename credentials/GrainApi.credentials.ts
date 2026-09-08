import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GrainApi implements ICredentialType {
	name = 'grainApi';

	displayName = 'Grain API';

	documentationUrl = 'https://developers.grain.com/';

	icon: Icon = { light: 'file:grain.svg', dark: 'file:grain.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Grain Personal Access Token (PAT) or Workspace Access Token (WAT). Create one at Grain → Settings → Integrations → API.',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			default: '2025-10-31',
			required: true,
			description: 'Value sent in the required "Public-Api-Version" header',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.grain.com',
			description: 'Base URL of the Grain API. Only change this if instructed by Grain.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
				'Public-Api-Version': '={{$credentials.apiVersion}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/_/public-api/v2/users',
			method: 'POST',
		},
	};
}
