import type { ComponentType } from "react"

import { colors } from "@/theme"

import { AvecTutorial } from "./AvecTutorial"
import { Blank } from "./Blank"

export type Experiment = {
  title: string
  subtitle: string
  accent: string
  component: ComponentType
}

/**
 * The registry that powers the menu. To add an experiment: drop a component in
 * this folder and append an entry here. Keep them self-contained (full-screen,
 * their own background) so they read well when recorded for social.
 */
export const experiments: Experiment[] = [
  {
    title: "Blank",
    subtitle: "Empty white canvas - start here",
    accent: colors.accent,
    component: Blank,
  },
  {
    title: "Avec Tutorial",
    subtitle: "Onboarding card UI replica",
    accent: colors.green,
    component: AvecTutorial,
  },
]
