import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { FontMatchComponent } from "./components/font-match/font-match.component";
import { MainLayoutComponent } from "./components/main-layout/main-layout.component";
import { AboutPageComponent } from "./pages/about-page/about-page.component";
import { DatabaseSearchComponent } from "./pages/database-search/database-search.component";
import { EffectPredictionComponent } from "~/app/pages/effect-prediction/effect-prediction.component";
import { EffectPredictionResultComponent } from "~/app/pages/effect-prediction-result/effect-prediction-result.component";
import { CenterLayoutComponent } from "./components/center-layout/center-layout.component";
import { LandingPageComponent } from "./pages/landing-page/landing-page.component";
import { TutorialPageComponent } from "./pages/tutorial-page/tutorial-page.component";


const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { 
    path: "", 
    component: CenterLayoutComponent,
    children: [
      { path: 'about', component: AboutPageComponent },
      { path: 'home', component: LandingPageComponent },
      { path: 'tutorial', component: TutorialPageComponent },
    ]
  },
  { 
    path: "", 
    component: MainLayoutComponent,
    children: [
      { path: 'about', component: AboutPageComponent },
      { path: "database-search", component: DatabaseSearchComponent },
      { path: 'effect-prediction', component: EffectPredictionComponent },
      { path: 'effect-prediction/result/:id', component: EffectPredictionResultComponent },
    ]
  },
  { path: "font-match", component: FontMatchComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
