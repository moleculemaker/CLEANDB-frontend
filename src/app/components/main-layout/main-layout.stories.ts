import type { Meta, StoryObj } from '@storybook/angular';

import { MainLayoutComponent } from './main-layout.component';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<MainLayoutComponent> = {
  title: 'MMLI/Main Layout',
  component: MainLayoutComponent,
  tags: ['autodocs'],
  argTypes: {},
  args: {},
};

export default meta;
type Story = StoryObj<MainLayoutComponent>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {},
};
