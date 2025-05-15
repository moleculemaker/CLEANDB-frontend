import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter, RouterModule } from '@angular/router';

// Import all commonly used services and modules
import { TestService } from '../app/services/test.service';
import { BodyCreateJobJobTypeJobsPost, Job, JobType } from '../app/api/mmli-backend/v1';
import { Observable, of } from 'rxjs';

// fixtures
import errorJobStatus from './fixtures/job-status--error.json';
import processingJobStatus from './fixtures/job-status--processing.json';
import queuedJobStatus from './fixtures/job-status--queued.json';
import completedJobStatus from './fixtures/job-status--completed.json';
import errorJobResult from './fixtures/job-result--default.json';
import completedJobResult from './fixtures/job-result--default.json';

// Define a strategy interface
interface TestServiceStrategy {
  createAndRunJob(jobType: JobType, requestBody: BodyCreateJobJobTypeJobsPost): Observable<Job>;
  getResultStatus(jobType: JobType, jobID: string): Observable<Job>;
  getResult(jobType: JobType, jobID: string): Observable<any>;
}

// Implement concrete strategies
class QueuedTestStrategy implements TestServiceStrategy {
  createAndRunJob(): Observable<Job> {
    return of(queuedJobStatus as Job);
  }
  getResultStatus(): Observable<Job> {
    return this.createAndRunJob();
  }
  getResult(): Observable<any> {
    return of({});
  }
}

class ErrorTestStrategy implements TestServiceStrategy {
  createAndRunJob(): Observable<Job> {
    return of(errorJobStatus as Job);
  }
  getResultStatus(): Observable<Job> {
    return this.createAndRunJob();
  }
  getResult(): Observable<any> {
    return of(errorJobResult);
  }
}

class ProcessingTestStrategy implements TestServiceStrategy {
  createAndRunJob(): Observable<Job> {
    return of(processingJobStatus as Job);
  }
  getResultStatus(): Observable<Job> {
    return this.createAndRunJob();
  }
  getResult(): Observable<any> {
    return of({});
  }
}

class CompletedTestStrategy implements TestServiceStrategy {
  createAndRunJob(): Observable<Job> {
    return of(completedJobStatus as Job);
  }
  getResultStatus(): Observable<Job> {
    return this.createAndRunJob();
  }
  getResult(): Observable<any> {
    return of(completedJobResult);
  }
}

// Factory method to create strategies
function createTestStrategy(testCase: 'queued' | 'error' | 'processing' | 'completed'): TestServiceStrategy {
  switch (testCase) {
    case 'error':
      return new ErrorTestStrategy();
    case 'processing':
      return new ProcessingTestStrategy();
    case 'completed':
      return new CompletedTestStrategy();
    default:
      return new QueuedTestStrategy();
  }
}

// Updated MockTestService
export class MockTestService {
  private strategy: TestServiceStrategy;

  constructor(testCase: 'queued' | 'error' | 'processing' | 'completed' = 'queued') {
    this.strategy = createTestStrategy(testCase);
  }

  setTestCase(testCase: 'queued' | 'error' | 'processing' | 'completed') {
    this.strategy = createTestStrategy(testCase);
  }

  createAndRunJob(jobType: JobType, requestBody: BodyCreateJobJobTypeJobsPost): Observable<Job> {
    return this.strategy.createAndRunJob(jobType, requestBody);
  }

  getResultStatus(jobType: JobType, jobID: string): Observable<Job> {
    return this.strategy.getResultStatus(jobType, jobID);
  }

  getResult(jobType: JobType, jobID: string): Observable<any> {
    return this.strategy.getResult(jobType, jobID);
  }
}

export const sharedModules = [
    RouterModule,
    // Add other common modules
];

export const sharedProviders = [
    { provide: TestService, useClass: MockTestService },
];

export const sharedDecorators = [
    moduleMetadata({
        imports: sharedModules,
        providers: sharedProviders,
    }),
    applicationConfig({
        providers: [
            provideRouter([]),
            provideHttpClient(withInterceptorsFromDi()),
        ],
    }),
];
