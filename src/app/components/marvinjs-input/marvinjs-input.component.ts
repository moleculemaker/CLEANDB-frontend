import { Component, EventEmitter, forwardRef, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { ButtonDirective, Button } from "primeng/button";
import { NgIf, AsyncPipe } from "@angular/common";
import { DialogModule } from "primeng/dialog";
import { PrimeTemplate } from "primeng/api";
import { MarvinJsEditorComponent } from "../marvinjs/marvinjs-editor.component";

@Component({
  selector: "app-marvinjs-input",
  templateUrl: "./marvinjs-input.component.html",
  styleUrls: ["./marvinjs-input.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarvinjsInputComponent),
      multi: true
    }
  ],
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonDirective, NgIf, DialogModule, MarvinJsEditorComponent, PrimeTemplate, Button]
})
export class MarvinjsInputComponent implements OnChanges, ControlValueAccessor {
  @Input() placeholder: string = "";
  @Input() ngModel: string = '';
  @Output() ngModelChange = new EventEmitter<string>();

  showDialog = false;

  #textInput = '';
  #marvinInput = '';

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get textInput() {
    return this.#textInput;
  }

  set textInput(value: string) {
    this.#textInput = value;
    this.ngModelChange.emit(value);
    this.onChange(value);
    this.onTouched();
  }

  get marvinInput() {
    return this.#marvinInput;
  }

  set marvinInput(value: string) {
    this.#marvinInput = value;
    this.textInput = value;
  }

  constructor() {
    if (this.ngModel) {
      this.#textInput = this.ngModel;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ngModel']) {
      this.#textInput = this.ngModel;
    }
  }

  writeValue(value: string): void {
    this.#textInput = value;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
