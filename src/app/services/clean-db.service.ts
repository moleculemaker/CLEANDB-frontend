import { Injectable } from "@angular/core";
import { Observable, from, map, of } from "rxjs";
import { scaleLinear } from 'd3';


import { BodyCreateJobJobTypeJobsPost, FilesService, Job, JobType, JobsService } from "../api/mmli-backend/v1";
import { EnvironmentService } from "./environment.service";

import { CleanDbRecord, cleanDbRecordRawToCleanDbRecord } from "../models/CleanDbRecord";
import { loadGzippedJson } from "../utils/loadGzippedJson";
import { ReactionSchemaRecord, ReactionSchemaRecordRaw, reactionSchemaRecordRawToReactionSchemaRecord } from "../models/ReactionSchemaRecord";
import { CLEANTypeaheadResponse, SearchService } from "../api/cleandb/v1"; // TODO: use the correct service


/* -------------------------------- File Imports -------------------------------- */
const exampleSearch = import('../../assets/example.db.json').then((module) => module.default);
const examplePrediction = import('../../assets/example.heatmap.json').then((module) => module.default);
const exampleStatus: any = import('../../assets/example.prediction.status.json').then((module) => module.default);

const reactionSchemaJson = loadGzippedJson<ReactionSchemaRecordRaw[]>('../../assets/rhea_reactions_ec.json.gz');

export type EffectPredictionResponseRaw = {
  row_headers: string[]
  col_headers: string[]
  values: number[][];
}

export type EffectPredictionResult = {
  rowKeys: string[]
  colKeys: string[]
  values: number[][];
}

@Injectable({
  providedIn: "root",
})
export class CleanDbService {
  frontendOnly = false;

  constructor(
    private jobsService: JobsService,
    private filesService: FilesService,
    private environmentService: EnvironmentService,
    private searchService: SearchService

    // private apiService: CleanDbApiService,
  ) {
    this.frontendOnly = this.environmentService.getEnvConfig().frontendOnly === "true";
  }

  createAndRunJob(jobType: JobType, requestBody: BodyCreateJobJobTypeJobsPost): Observable<Job> {
    if (this.frontendOnly) {
      return from(exampleStatus) as Observable<Job>;
    }
    return this.jobsService.createJobJobTypeJobsPost(jobType, requestBody);
  }

  getResultStatus(jobType: JobType, jobID: string): Observable<Job> {
    if (this.shouldUsePrecomputedResult(jobID)) {
      console.log('frontendOnly or precomputed');
      return from(exampleStatus) as Observable<Job>;
    }
    return this.jobsService.listJobsByTypeAndJobIdJobTypeJobsJobIdGet(jobType, jobID)
      .pipe(map((jobs) => jobs[0]));
  }

  // getResult(jobType: JobType, jobID: string): Observable<any> {
  //   if (this.shouldUsePrecomputedResult(jobID)) {
  //     return from(exampleSearch).pipe(map((records => records.map(cleanDbRecordRawToCleanDbRecord))))
  //   }
  //   return this.filesService.getResultsBucketNameResultsJobIdGet(jobType, jobID);
  // }

  getEffectPredictionResult(jobID: string): Observable<EffectPredictionResult> {
    const observable$
      = (this.shouldUsePrecomputedResult(jobID))
        ? from(examplePrediction)
        : this.filesService.getResultsBucketNameResultsJobIdGet(JobType.CleandbMepesm, jobID);

    return observable$.pipe(
      map(this.effectPredictionResponseToResult)
    );
  }

  getAutoComplete(type: string, query: string): Observable<CLEANTypeaheadResponse> {
    return this.searchService.getTypeaheadApiV1TypeaheadGet(type, query)
  }

  getData(query: any): Observable<any> {
    if (this.frontendOnly) {
      return from(exampleSearch).pipe(map((recordsResponse => ({
        ...recordsResponse,
        data: recordsResponse.data.map(cleanDbRecordRawToCleanDbRecord)
      }))))
    }
    return this.searchService.getDataApiV1SearchGet(query);
  }

  getTypeahead(query: {field_name: string, search :string}) : Observable<{ label: string; value: string; }[]> {
    if (this.frontendOnly) {
      return of([]);
    }
    if (query.field_name == 'ec_number') {
      return this.searchService.getEcLookupApiV1EcLookupGet(query).pipe(
        map(({matches}) => 
          matches.map((match: { ec_number: string, ec_name: string }) => ({ label: match.ec_number + ' ' + match.ec_name, value: match.ec_number }))
        )
      )
    }
    return this.searchService.getTypeaheadApiV1TypeaheadGet(query).pipe(map(({matches}) => matches.map((match: string) => ({ label: match, value: match}))));
  }

  getReactionSchemaForEc(ec: string): Observable<ReactionSchemaRecord | null> {
    return from(reactionSchemaJson).pipe(
      map(data => data.find(r => r.ec_numbers.includes(ec))),
      map(data => data
        ? reactionSchemaRecordRawToReactionSchemaRecord(data)
        : null
      )
    );
  }

  getError(jobType: JobType, jobID: string): Observable<string> {
    if (this.shouldUsePrecomputedResult(jobID)) {
      return of('error');
    }
    return this.filesService.getErrorsBucketNameErrorsJobIdGet(jobType, jobID);
  }

  updateSubscriberEmail(jobType: JobType, jobID: string, email: string) {
    if (this.shouldUsePrecomputedResult(jobID)) {
      return from(exampleStatus) as Observable<Job>;
    }
    return this.jobsService.patchExistingJobJobTypeJobsJobIdRunIdPatch(jobType, {
      job_id: jobID,
      run_id: 0,
      email: email,
    });
  }

  /* ---------------------------------- Utils --------------------------------- */
  effectPredictionResponseToResult(response: EffectPredictionResponseRaw): EffectPredictionResult {
    return {
      rowKeys: response.row_headers,
      colKeys: response.col_headers,
      values: response.values
    }
  }

  getColorFor(value: number, dataMin: number, dataMax: number): string {
    const min = Math.min(dataMin, -10);
    const max = Math.max(dataMax, -10);
    return scaleLinear(
      [min, -2, -1, 0, 1, 2, max],
      ['#BA4147', '#CF8184', '#EAD0CF', '#E3E2EB', '#B4B7DE', '#868BC7', '#515CC2'],
    )(value);
  }

  shouldUsePrecomputedResult(jobID: string): boolean {
    return this.frontendOnly || jobID === 'precomputed';
  }
}
