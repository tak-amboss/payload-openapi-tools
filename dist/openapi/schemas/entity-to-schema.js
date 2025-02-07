import { entityToJSONSchema as payloadEntityToJSONSchema } from 'payload';
import convert from '@openapi-contrib/json-schema-to-openapi-schema';
import { getDescription, getSingularSchemaName } from '../utils';
const cleanReferences = (schema, config) => {
    const asString = JSON.stringify(schema);
    return JSON.parse(asString.replace(/#\/definitions\/([^"]+)/g, (_, slug) => {
        const collection = config.collections.find(col => col.slug === slug) || config.globals.find(gl => gl.slug === slug);
        const name = collection ? getSingularSchemaName(collection) : slug;
        return `#/components/schemas/${name}`;
    }));
};
const isReferenceObject = (schema) => '$ref' in schema;
// Officialy empty required is allowed for openapi v3 and v3.1, but it's not for swagger v2 and some tools don't accept it
const stripEmptyRequired = (schema) => {
    if (schema.type === 'array') {
        return {
            ...schema,
            items: isReferenceObject(schema.items) ? schema.items : stripEmptyRequired(schema.items),
        };
    }
    return {
        ...schema,
        properties: schema.properties &&
            Object.entries(schema.properties).reduce((all, [key, value]) => {
                all[key] = isReferenceObject(value) ? value : stripEmptyRequired(value);
                return all;
            }, {}),
        oneOf: schema.oneOf?.map(option => (isReferenceObject(option) ? option : stripEmptyRequired(option))),
        anyOf: schema.anyOf?.map(option => (isReferenceObject(option) ? option : stripEmptyRequired(option))),
        allOf: schema.allOf?.map(option => (isReferenceObject(option) ? option : stripEmptyRequired(option))),
        required: schema.required?.length ? schema.required : undefined,
    };
};
function removeHiddenFields(entity) {
    return entity
        .filter(field => !("hidden" in field) || field.hidden !== true);
}
export const entityToSchema = async (config, incomingEntity) => {
    const fieldDefinitionsMap = new Map();
    // only the flattenedFields are used to generate the schema, so we need to remove the hidden fields from them
    incomingEntity.flattenedFields = removeHiddenFields(incomingEntity.flattenedFields);
    const jsonschema = payloadEntityToJSONSchema(config, incomingEntity, fieldDefinitionsMap, 'text');
    const rawSchema = await convert(jsonschema);
    const fieldDefinitions = {};
    for (const [key, definition] of fieldDefinitionsMap.entries()) {
        const convertedDef = await convert(definition);
        fieldDefinitions[key] = cleanReferences(stripEmptyRequired(convertedDef), config);
    }
    return {
        schema: {
            description: getDescription(incomingEntity),
            ...cleanReferences(stripEmptyRequired(rawSchema), config),
        },
        fieldDefinitions,
    };
};
