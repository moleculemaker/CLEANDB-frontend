import { EnvironmentService } from '~/app/services/environment.service';

/**
 * EnvironmentService loads its config from a JSON file fetched by an
 * APP_INITIALIZER, so under TestBed `getEnvConfig()` returns undefined and every
 * consumer that dereferences it throws before the component is even created --
 * CleanDbService does exactly that in its constructor.
 *
 * `frontendOnly: 'true'` additionally makes CleanDbService serve its bundled
 * example fixtures rather than issue HTTP requests, which is what a smoke test
 * wants.
 */
export function provideEnvironmentServiceStub() {
  return {
    provide: EnvironmentService,
    useValue: { getEnvConfig: () => ({ frontendOnly: 'true' }) },
  };
}
