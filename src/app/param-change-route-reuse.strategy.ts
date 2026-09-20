import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, Params } from '@angular/router';

/**
 * Recreate a routed component when its path params change.
 *
 * Angular's default strategy reuses a component whenever the route config is the
 * same, so navigating from `effect-prediction/result/A` to `.../result/B` kept the
 * result component that was built for A: it read its job id from a snapshot once,
 * and every result, selection and structure field still described A. Comparing
 * params here gives B a fresh instance, exactly as opening the URL directly would.
 *
 * Query params and fragments are not path params, so they never cause a remount,
 * and a parent whose own params are unchanged (the layouts, whose path is '') stays
 * mounted while its child is swapped.
 */
@Injectable()
export class ParamChangeRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return super.shouldReuseRoute(future, curr) && sameParams(future.params, curr.params);
  }
}

function sameParams(a: Params, b: Params): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}
