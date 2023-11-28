import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { MathjaxModule } from 'mathjax-angular';
import { MainComponent } from './main/main.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { BrowserModule } from '@angular/platform-browser';
import { SettingsComponent } from './settings/settings.component';
import { OptionBarComponent } from './main/option-bar/option-bar.component';
import { HighlightModule, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { BottomBarComponent } from './main/bottom-bar/bottom-bar.component';
import { ChatHistoryComponent } from './main/chat-history/chat-history.component';
import { ButtonsAreaComponent } from './main/buttons-area/buttons-area.component';
import { VideoFeedbackComponent } from './video-feedback/video-feedback.component';
import { TabsBarComponent } from './main/tabs-bar/tabs-bar.component';
import { StatusIndicatorComponent } from './main/status-indicator/status-indicator.component';
import { EditComponent } from './edit/edit.component';
import { LinkifyPipe } from '../pipes/linkify.pipe';

@NgModule({
  declarations: [
    AppComponent,
    ChatHistoryComponent,
    ButtonsAreaComponent,
    OptionBarComponent,
    BottomBarComponent,
    SettingsComponent,
    MainComponent,
    VideoFeedbackComponent,
    TabsBarComponent,
    StatusIndicatorComponent,
    EditComponent,
    LinkifyPipe
  ],
  imports: [
      BrowserModule,
      HttpClientModule,
      AppRoutingModule,
      FormsModule,
      CommonModule,
      NgSelectModule,
      HighlightModule,
      MathjaxModule.forRoot({
        'config': {
          'tex': {
            'inlineMath': [
              ['$', '$'],
              ['\\(', '\\)']
            ],
            'displayMath': [
              ['$$', '$$'],
              ['\\[', '\\]']
            ],
            processEscapes: true
          },
          'src': `assets/mathjax/es5/startup.js`
        }
      })
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        fullLibraryLoader: () => import('highlight.js'),
        themePath: 'assets/styles/github.css'
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
