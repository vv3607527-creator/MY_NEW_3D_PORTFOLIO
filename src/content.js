/* ═══════════════════════════════════════════════════════════════════
   VENKATESH — content. Single source of truth for copy that is
   rendered from JS.
   ═══════════════════════════════════════════════════════════════════ */

export const SITE = {
  name: 'Venkatesh',
  email: 'venkeypro456@gmail.com',
  phone: '+91 8639865789',
  location: 'India',
  links: {
    linkedin: 'https://www.linkedin.com/in/venky-venkatesh-726172415',
    instagram: 'https://instagram.com/mrvenky60',
    x: 'https://x.com/VENKY5789',
    portfolio3d: 'https://my-new-3-d-build-project.vercel.app',
  },
};

/** The two faces of the hero. Hovering shows the other one; clicking swaps. */
export const MODES = {
  designer: {
    title: ['I design', 'experiences.'],
    body: 'Web designer and creative technologist. Scroll-driven, three-dimensional interfaces that hold sixty frames a second.',
    hint: 'Move to augment · Click to switch',
  },
  engineer: {
    title: ['I build', 'futures.'],
    body: 'AI builder and creative developer. Tools, agents and digital experiences wired into the real world.',
    hint: 'Move to stay human · Click to switch',
  },
};

/** Pinned "craft" chapters. `shape` names a particle target in gl/shapes.js. */
export const CRAFT = [
  {
    id: 'design',
    index: '01',
    title: 'Web Design',
    kicker: 'From brief to experience.',
    body: 'Grid, rhythm and hierarchy first. Then type, surfaces and space. Then motion, until timing becomes part of the design. The result is scroll-driven WebGL that people feel before they read.',
    steps: ['Brief', 'Structure', 'Visual system', 'Motion', 'Experience'],
    tags: ['Three.js', 'GSAP', 'WebGL', 'Vite', 'CSS'],
    image: 'assets/img/role-design.webp',
    alt: 'Venkatesh arranging floating interface panels that glow orange and magenta',
    accent: '#ff5a1f',
  },
  {
    id: 'agents',
    index: '02',
    title: 'AI Building',
    kicker: 'From idea to production.',
    body: 'AI-powered tools built for the real world — from robotics experiments and automation pipelines to intelligent web experiences. Certified by NPTEL and Skill India; obsessed with what comes next.',
    steps: ['Research', 'Prototype', 'Build', 'Deploy'],
    tags: ['AI Tools', 'Automation', 'Python', 'APIs'],
    image: 'assets/img/role-agents.webp',
    alt: 'Venkatesh with AI tools and automation systems floating around him',
    accent: '#45e6ff',
  },
  {
    id: 'data',
    index: '03',
    title: '3D & Motion',
    kicker: 'From static to cinematic.',
    body: 'Drone sites, motor experiences, coffee brands, interior portals — every project gets scroll-driven animations, 3D product views and motion that makes a brand feel premium before anyone reads a word.',
    steps: ['Concept', 'Layout', '3D', 'Animation', 'Launch'],
    tags: ['Three.js', 'GSAP', 'ScrollTrigger', 'Lenis', 'WebGL'],
    image: 'assets/img/role-data.webp',
    alt: 'Venkatesh surrounded by glowing 3D interfaces and motion trails',
    accent: '#8f7bff',
  },
];

import aws from './icons/aws.svg?raw';
import spark from './icons/spark.svg?raw';
import kafka from './icons/kafka.svg?raw';
import airflow from './icons/airflow.svg?raw';
import terraform from './icons/terraform.svg?raw';
import python from './icons/python.svg?raw';

/** Logos on the rotating ring. */
export const RING = [
  { name: 'Three.js', svg: spark, tint: '#f0f0f0' },
  { name: 'GSAP', svg: airflow, tint: '#8be04e' },
  { name: 'Vite', svg: kafka, tint: '#b473f7' },
  { name: 'Python', svg: python, tint: '#5aa2e0' },
  { name: 'AWS', svg: aws, tint: '#FF9900' },
  { name: 'Vercel', svg: terraform, tint: '#ffffff' },
];

export const STACK_GROUPS = [
  { title: 'Web design & 3D', accent: '#ff5a1f', items: ['Three.js', 'React Three Fiber', 'GSAP', 'ScrollTrigger', 'Lenis', 'Vite', 'HTML / CSS', 'JavaScript'] },
  { title: 'AI & automation', accent: '#45e6ff', items: ['Python', 'AI APIs', 'Automation tools', 'NPTEL certified'] },
  { title: 'Tools & deployment', accent: '#8f7bff', items: ['Vercel', 'Git', 'GitHub', 'Figma', 'VS Code', 'Node.js', 'npm', 'Sharp'] },
];
