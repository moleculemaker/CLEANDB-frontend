import { Meta, StoryObj } from '@storybook/angular';
import { MoleculeImageComponent } from './molecule-image.component';

const meta: Meta<MoleculeImageComponent> = {
  title: 'MMLI/Molecule Image',
  component: MoleculeImageComponent,
  tags: ['autodocs'],
  render: (args: MoleculeImageComponent) => ({
    props: {
      ...args,
    },
  }),
};

export default meta;
type Story = StoryObj<MoleculeImageComponent>;

export const Default: Story = {
  args: {
    molecule: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="50" fill="blue"/></svg>',
    width: 200,
    height: 200,
  },
};

export const NoImage: Story = {
  args: {
    molecule: '',
    width: 200,
    height: 200,
  },
};

export const CustomSize: Story = {
  args: {
    molecule: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="300" height="150" fill="green"/></svg>',
    width: 300,
    height: 150,
  },
};