import Joi from "joi";

const configSchema = Joi.object({
    scraper: Joi.object({
        urls: Joi.array()
            .items(Joi.string().uri({ scheme: ["http", "https"] }))
            .required(),
        puppeteerOptions: Joi.object().optional(),
        addons: Joi.array()
            .items(
                Joi.object({
                    name: Joi.string().required(),
                    twice: Joi.boolean().default(false).optional(),
                    when: Joi.string().valid("before", "after").default("before").optional(),
                    run: Joi.function().required(),
                })
            )
            .required(),
        interval: Joi.number().integer().default(60_000).optional(),
    }).required(),
    exporter: Joi.object({ port: Joi.number().integer().min(0).max(65535).optional() }).required(),
});

export const validateConfig = (config: any) => configSchema.validate(config);
