import { basicParameters, findParameters } from '../../../base-config';
import { createPaginatedDocumentSchema, createRef, createRequestBody, createResponse, createUpsertConfirmationSchema, entityToSchema, } from '../../../schemas';
import { getRouteAccess, includeIfAvailable } from '../../route-access';
import { getSingular, getPlural, getSingularSchemaName, getPluralSchemaName } from '../../../utils';
export const getMainRoutes = async (collection, options, payloadConfig) => {
    const singleItem = getSingular(collection);
    const plural = getPlural(collection);
    const schemaName = getSingularSchemaName(collection);
    const pluralSchemaName = getPluralSchemaName(collection);
    const paths = {
        [`/${collection.slug}`]: {
            ...includeIfAvailable(collection, 'read', {
                get: {
                    summary: `Find paginated ${plural}`,
                    description: `Find paginated ${plural}`,
                    tags: [collection.slug],
                    security: await getRouteAccess(collection, 'read', options.access),
                    parameters: [...basicParameters, ...findParameters],
                    responses: {
                        '200': createRef(pluralSchemaName, 'responses'),
                    },
                },
            }),
            ...includeIfAvailable(collection, 'create', {
                post: {
                    summary: `Create a new ${singleItem}`,
                    description: `Create a new ${singleItem}`,
                    tags: [collection.slug],
                    security: await getRouteAccess(collection, 'create', options.access),
                    parameters: basicParameters,
                    requestBody: createRef(schemaName, 'requestBodies'),
                    responses: {
                        '200': createRef(`${schemaName}UpsertConfirmation`, 'responses'),
                    },
                },
            }),
        },
        [`/${collection.slug}/{id}`]: {
            ...includeIfAvailable(collection, 'read', {
                get: {
                    summary: `Get a single ${singleItem} by its id`,
                    description: `Get a single ${singleItem} by its id`,
                    tags: [collection.slug],
                    security: await getRouteAccess(collection, 'read', options.access),
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            description: `id of the ${singleItem}`,
                            required: true,
                            schema: { type: 'string' },
                        },
                        ...basicParameters,
                        ...findParameters,
                    ],
                    responses: {
                        '200': createRef(schemaName, 'responses'),
                        '404': createRef('NotFoundError', 'responses'),
                    },
                },
            }),
            ...includeIfAvailable(collection, 'update', {
                patch: {
                    summary: `Updates a ${singleItem}`,
                    description: `Updates a ${singleItem}`,
                    tags: [collection.slug],
                    security: await getRouteAccess(collection, 'update', options.access),
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            description: `id of the ${singleItem}`,
                            required: true,
                            schema: { type: 'string' },
                        },
                        ...basicParameters,
                    ],
                    requestBody: createRef(schemaName, 'requestBodies'),
                    responses: {
                        '200': createRef(`${schemaName}UpsertConfirmation`, 'responses'),
                        '404': createRef('NotFoundError', 'responses'),
                    },
                },
            }),
            ...includeIfAvailable(collection, 'delete', {
                delete: {
                    summary: `Deletes an existing ${singleItem}`,
                    description: `Deletes an existing ${singleItem}`,
                    tags: [collection.slug],
                    security: await getRouteAccess(collection, 'delete', options.access),
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            description: `id of the ${singleItem}`,
                            required: true,
                            schema: { type: 'string' },
                        },
                        ...basicParameters,
                    ],
                    responses: {
                        '200': createRef(`${schemaName}UpsertConfirmation`, 'responses'),
                        '404': createRef('NotFoundError', 'responses'),
                    },
                },
            }),
        },
        [`/${collection.slug}/count`]: {
            ...includeIfAvailable(collection, 'read', {
                get: {
                    summary: `Count ${plural}`,
                    description: `Count ${plural}`,
                    tags: [collection.slug],
                    security: await getRouteAccess(collection, 'read', options.access),
                    parameters: [],
                    responses: {
                        '200': createRef('count', 'responses'),
                    },
                },
            }),
        },
    };
    const { schema, fieldDefinitions } = await entityToSchema(payloadConfig, collection);
    const { example, examples } = collection.custom?.openapi || {};
    const components = {
        schemas: {
            [schemaName]: { ...schema, ...{ example, examples } },
            ...includeIfAvailable(collection, 'read', {
                [pluralSchemaName]: createPaginatedDocumentSchema(schemaName, plural),
            }),
            ...includeIfAvailable(collection, ['create', 'update', 'delete'], {
                [`${schemaName}UpsertConfirmation`]: createUpsertConfirmationSchema(schemaName, singleItem),
            }),
            ...fieldDefinitions,
        },
        requestBodies: {
            ...includeIfAvailable(collection, ['create', 'update'], {
                [`${schemaName}Request`]: createRequestBody(schemaName),
            }),
        },
        responses: {
            ...includeIfAvailable(collection, 'read', { [`${schemaName}Response`]: createResponse('ok', schemaName) }),
            ...includeIfAvailable(collection, 'read', { [`${pluralSchemaName}Response`]: createResponse('ok', pluralSchemaName) }),
            ...includeIfAvailable(collection, ['create', 'update', 'delete'], {
                [`${schemaName}UpsertConfirmationResponse`]: createResponse('ok', `${schemaName}UpsertConfirmation`),
            }),
        },
    };
    return { paths, components };
};
