import { EnvironmentService } from '~/app/services/environment.service';
import { EnvVars } from '~/app/models/envvars';

/**
 * EnvironmentService is `@Injectable()` with no `providedIn`, and is provided
 * only in the `bootstrapApplication` provider array in `src/main.ts`, which
 * TestBed never loads. So any spec whose component injects CleanDbService or
 * UserInfoService fails to construct it at all:
 *
 *   NullInjectorError: No provider for EnvironmentService!
 *
 * What is required is a provider, not merely a config value -- the real
 * service is never instantiated under TestBed, so `getEnvConfig()` is never
 * reached.
 *
 * `frontendOnly: 'true'` additionally makes CleanDbService serve its bundled
 * example fixtures rather than issue HTTP requests, which is what a smoke test
 * wants. The other fields are populated because UserInfoService caches the
 * whole EnvVars in its constructor; leaving them out gives it `undefined` URLs
 * and its `fetchUserInfo()` then fails inside a `catchError` that hides it.
 */
const envConfig: EnvVars = {
  hostname: 'http://environment-service.stub',
  basePath: '/api',

  cleandbHostname: 'http://environment-service.stub',
  cleandbBasePath: '/api',

  signInUrl: 'http://environment-service.stub/signin',
  signOutUrl: 'http://environment-service.stub/signout',

  userInfoUrl: 'http://environment-service.stub/userinfo',
  frontendOnly: 'true',
};

const stub: Pick<EnvironmentService, 'getEnvConfig'> = {
  getEnvConfig: () => envConfig,
};

export function provideEnvironmentServiceStub() {
  return {
    provide: EnvironmentService,
    useValue: stub,
  };
}
