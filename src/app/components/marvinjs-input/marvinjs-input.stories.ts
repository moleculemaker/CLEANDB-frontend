import { Meta, StoryObj } from '@storybook/angular';
import { MarvinjsInputComponent } from './marvinjs-input.component';
import { moduleMetadata } from '@storybook/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

const meta: Meta<MarvinjsInputComponent> = {
  title: 'MMLI/Marvinjs Input',
  component: MarvinjsInputComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [FormsModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
    }),
  ],
};

export default meta;
type Story = StoryObj<MarvinjsInputComponent>;

export const Default: Story = {
  args: {
    placeholder: 'Enter molecule structure',
  },
};