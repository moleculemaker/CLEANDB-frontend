import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { EnvironmentService } from '@services/environment.service';
import { APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app/app-routing.module';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ChartModule } from 'primeng/chart';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MessagesModule } from 'primeng/messages';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { PanelModule } from 'primeng/panel';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StepsModule } from 'primeng/steps';
import { SliderModule } from 'primeng/slider';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ListboxModule } from 'primeng/listbox';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SidebarModule } from 'primeng/sidebar';
import { TabViewModule } from 'primeng/tabview';
import { TabMenuModule } from 'primeng/tabmenu';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { FileUploadModule } from 'primeng/fileupload';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MatomoModule, MatomoRouterModule } from 'ngx-matomo-client';
import { MenuModule } from 'primeng/menu';
import { ApiModule, Configuration } from '@api/mmli-backend/v1';
import { DialogModule } from 'primeng/dialog';
import { AppComponent } from './app/app.component';

const initAppFn = (envService: EnvironmentService) => {
  return () => envService.loadEnvConfig("/assets/config/envvars.json");
};




bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, AppRoutingModule, CardModule, ChipModule, ChartModule, FormsModule, MessagesModule, ButtonModule, InputTextareaModule, InputNumberModule, PanelModule, MultiSelectModule, ProgressBarModule, SelectButtonModule, SkeletonModule, ProgressSpinnerModule, StepsModule, SliderModule, DropdownModule, TableModule, InputTextModule, ListboxModule, OverlayPanelModule, SidebarModule, TabViewModule, TabMenuModule, RadioButtonModule, CheckboxModule, FileUploadModule, SplitButtonModule, PanelModule, MatomoModule.forRoot({
            siteId: 8, //TODO: update site id
            trackerUrl: 'https://matomo.mmli1.ncsa.illinois.edu/'
        }), MatomoRouterModule, MenuModule, ApiModule.forRoot(() => new Configuration()), ReactiveFormsModule, DialogModule),
        EnvironmentService,
        {
            provide: APP_INITIALIZER,
            useFactory: initAppFn,
            multi: true,
            deps: [EnvironmentService],
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations(),
        provideAnimations()
    ]
})
  .catch(err => console.error(err));
