import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { EnvVars } from "../models/envvars";
import {Configuration} from "../api/mmli-backend/v1";
import { Configuration as SearchConfiguration } from "../api/cleandb/v1";

@Injectable()
export class EnvironmentService {
  private envConfig: EnvVars;

  constructor(
    private readonly http: HttpClient,
    private apiConfig: Configuration,
    private searchApiConfig: SearchConfiguration
  ) {}

  async loadEnvConfig(configPath: string): Promise<void> {
    console.log('Loading environment config!');
    this.envConfig = await lastValueFrom(this.http.get<EnvVars>(configPath));
    this.apiConfig.basePath = this.envConfig.hostname + this.envConfig.basePath
    this.searchApiConfig.basePath = this.envConfig.cleandbHostname + this.envConfig.cleandbBasePath
  }

  getEnvConfig(): EnvVars {
    return this.envConfig;
  }
}
