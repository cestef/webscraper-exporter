class Exporter {
    options: ExporterOptions;
    constructor(options: ExporterOptions) {
        this.options = options;
    }
}
export { Exporter };

export interface ExporterOptions {
    verbose: boolean;
}
