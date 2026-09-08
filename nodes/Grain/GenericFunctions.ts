import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type GrainRequestContext =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

/**
 * Make an authenticated request against the Grain public API.
 */
export async function grainApiRequest(
	this: GrainRequestContext,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: Partial<IHttpRequestOptions> = {},
): Promise<any> {
	const credentials = await this.getCredentials('grainApi');
	const baseUrl = ((credentials.baseUrl as string) || 'https://api.grain.com').replace(/\/$/, '');

	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		url: `${baseUrl}${resource}`,
		json: true,
		...option,
	};

	if (options.body && Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	if (options.qs && Object.keys(options.qs as IDataObject).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'grainApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Walk Grain's cursor-based pagination and collect every item under `propertyName`.
 */
export async function grainApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let responseData: IDataObject;

	do {
		responseData = await grainApiRequest.call(this, method, resource, body, qs);
		const items = (responseData[propertyName] as IDataObject[]) ?? [];
		returnData.push(...items);
		body.cursor = responseData.cursor;
	} while (responseData.cursor);

	return returnData;
}
