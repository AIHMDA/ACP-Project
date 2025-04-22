export interface PluginDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface PluginCapability {
  name: string;
  description: string;
  handler: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

export interface PluginConfiguration {
  schema: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      default?: any;
      description?: string;
      enum?: any[];
    };
  };
  current: Record<string, any>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  minHostVersion?: string;
  maxHostVersion?: string;
  dependencies?: PluginDependency[];
  hooks: Array<{
    name: string;
    handler: string;
    priority?: number;
  }>;
  capabilities?: PluginCapability[];
  configuration?: PluginConfiguration;
}

export interface PluginContext {
  workspaceId: string;
  pluginId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export class PluginManager {
  private plugins: Map<string, {
    manifest: PluginManifest;
    instance: unknown;
    status: 'registered' | 'active' | 'inactive' | 'error';
  }>;
  private hooks: Map<string, Array<{
    pluginId: string;
    handler: string;
    priority: number;
  }>>;
  private readonly hostVersion: string;

  constructor(hostVersion: string = '1.0.0') {
    this.plugins = new Map();
    this.hooks = new Map();
    this.hostVersion = hostVersion;
  }

  public async registerPlugin(manifest: PluginManifest): Promise<void> {
    // Validér version kompatibilitet
    if (!this.isVersionCompatible(manifest)) {
      throw new Error(
        `Plugin ${manifest.id} er ikke kompatibel med denne version af værten`
      );
    }

    // Tjek afhængigheder
    await this.validateDependencies(manifest);

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} er allerede registreret`);
    }

    // Validér konfiguration
    if (manifest.configuration) {
      this.validateConfiguration(manifest.configuration);
    }

    // Register plugin
    this.plugins.set(manifest.id, {
      manifest,
      instance: null,
      status: 'registered'
    });

    // Register hooks
    for (const hook of manifest.hooks) {
      const hookName = hook.name;
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }

      const hooks = this.hooks.get(hookName)!;
      hooks.push({
        pluginId: manifest.id,
        handler: hook.handler,
        priority: hook.priority || 10
      });

      // Sort hooks by priority
      hooks.sort((a, b) => a.priority - b.priority);
    }
  }

  private isVersionCompatible(manifest: PluginManifest): boolean {
    if (!manifest.minHostVersion && !manifest.maxHostVersion) {
      return true;
    }

    const compareVersions = (v1: string, v2: string): number => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 !== part2) {
          return part1 - part2;
        }
      }
      return 0;
    };

    if (manifest.minHostVersion && 
        compareVersions(this.hostVersion, manifest.minHostVersion) < 0) {
      return false;
    }

    if (manifest.maxHostVersion && 
        compareVersions(this.hostVersion, manifest.maxHostVersion) > 0) {
      return false;
    }

    return true;
  }

  private async validateDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies) {
      return;
    }

    const missingDeps: string[] = [];
    const incompatibleDeps: string[] = [];

    for (const dep of manifest.dependencies) {
      const plugin = this.plugins.get(dep.id);
      
      if (!plugin && !dep.optional) {
        missingDeps.push(dep.id);
        continue;
      }

      if (plugin && !this.isVersionCompatible({
        ...plugin.manifest,
        minHostVersion: dep.version,
        maxHostVersion: dep.version
      })) {
        incompatibleDeps.push(dep.id);
      }
    }

    if (missingDeps.length > 0 || incompatibleDeps.length > 0) {
      throw new Error(
        `Plugin afhængighedsfejl for ${manifest.id}:\n` +
        (missingDeps.length > 0 
          ? `Manglende: ${missingDeps.join(', ')}\n` 
          : '') +
        (incompatibleDeps.length > 0 
          ? `Inkompatible versioner: ${incompatibleDeps.join(', ')}` 
          : '')
      );
    }
  }

  private validateConfiguration(config: PluginConfiguration): void {
    const { schema, current } = config;
    const errors: string[] = [];

    for (const [key, def] of Object.entries(schema)) {
      if (def.required && !(key in current)) {
        errors.push(`Manglende påkrævet konfiguration: ${key}`);
        continue;
      }

      if (key in current) {
        const value = current[key];
        if (def.enum && !def.enum.includes(value)) {
          errors.push(
            `Ugyldig værdi for ${key}. Skal være en af: ${def.enum.join(', ')}`
          );
        }

        if (typeof value !== def.type) {
          errors.push(
            `Ugyldig type for ${key}. Forventede ${def.type}, fik ${typeof value}`
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Konfigurationsfejl:\n${errors.join('\n')}`
      );
    }
  }

  public async executeCapability(
    pluginId: string,
    capabilityName: string,
    params: Record<string, any>
  ): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'active') {
      throw new Error(
        `Plugin ${pluginId} er ikke aktiv eller findes ikke`
      );
    }

    const capability = plugin.manifest.capabilities?.find(
      c => c.name === capabilityName
    );
    if (!capability) {
      throw new Error(
        `Capability ${capabilityName} findes ikke i plugin ${pluginId}`
      );
    }

    // Validér parametre
    if (capability.parameters) {
      const missingParams = capability.parameters
        .filter(p => p.required && !(p.name in params))
        .map(p => p.name);

      if (missingParams.length > 0) {
        throw new Error(
          `Manglende påkrævede parametre: ${missingParams.join(', ')}`
        );
      }
    }

    try {
      const handler = this.resolveHandler(plugin.instance, capability.handler);
      return await handler(params);
    } catch (error) {
      console.error(
        `Fejl ved udførelse af capability ${capabilityName} fra plugin ${pluginId}:`,
        error
      );
      throw error;
    }
  }

  public getPluginConfiguration(pluginId: string): PluginConfiguration | undefined {
    return this.plugins.get(pluginId)?.manifest.configuration;
  }

  public async updatePluginConfiguration(
    pluginId: string,
    config: Record<string, any>
  ): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} findes ikke`);
    }

    if (!plugin.manifest.configuration) {
      throw new Error(`Plugin ${pluginId} understøtter ikke konfiguration`);
    }

    // Validér ny konfiguration
    this.validateConfiguration({
      schema: plugin.manifest.configuration.schema,
      current: config
    });

    // Opdater konfiguration
    plugin.manifest.configuration.current = config;

    // Hvis plugin er aktiv, genindlæs den med ny konfiguration
    if (plugin.status === 'active') {
      await this.deactivatePlugin(pluginId);
      await this.activatePlugin(pluginId);
    }
  }

  public async executeHook(
    hookName: string, 
    context: PluginContext
  ): Promise<PluginContext> {
    const hooks = this.hooks.get(hookName);
    if (!hooks) {
      return context;
    }

    let currentContext = { ...context };
    
    for (const hook of hooks) {
      const plugin = this.plugins.get(hook.pluginId);
      if (!plugin || plugin.status !== 'active') {
        continue;
      }

      try {
        // Execute plugin hook
        const handler = this.resolveHandler(plugin.instance, hook.handler);
        currentContext = await handler(currentContext);
      } catch (error) {
        console.error(
          `Error executing hook ${hookName} from plugin ${hook.pluginId}:`,
          error
        );
      }
    }

    return currentContext;
  }

  private resolveHandler(instance: unknown, handlerPath: string): Function {
    const parts = handlerPath.split('.');
    let current: any = instance;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        throw new Error(`Cannot resolve handler ${handlerPath}`);
      }
    }

    if (typeof current !== 'function') {
      throw new Error(`Handler ${handlerPath} is not a function`);
    }

    return current;
  }

  public getPlugin(pluginId: string) {
    return this.plugins.get(pluginId);
  }

  public listPlugins() {
    return Array.from(this.plugins.entries()).map(([_, plugin]) => ({
      ...plugin.manifest,
      status: plugin.status
    }));
  }

  public async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Activate plugin logic here
      plugin.status = 'active';
    } catch (error) {
      plugin.status = 'error';
      throw error;
    }
  }

  public async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Deactivate plugin logic here
      plugin.status = 'inactive';
    } catch (error) {
      plugin.status = 'error';
      throw error;
    }
  }
} 