# Digital project content model

## Core fields

Title, slug, summary, problemStatement, status (`DesignPortfolioStatus`), year, role, timelineLabel, teamLabel, platformLabel, toolsLabel, industryLabel, projectTypeLabel, disciplines (category tags), featured, published, coverMedia, SEO title/description, ogImageKey.

## Case study JSON (`caseStudy`)

Keys: overview, context, research, goals, responsibilities, existingWorkflow, informationArchitecture, userFlows, wireframes, designSystem, features, technicalApproach, challenges, outcomes, nextSteps.

Values: string or string[]. Lines starting with `TODO` and `[TODO:…]` markers are stripped publicly.

## Categories (disciplines[])

product, ux-ui, graphic, web, ai-automation, identity, print, digital, packaging.

## Status labels

Live Product, Working MVP, Interactive Prototype, Product Concept, Internal Tool, Client Project, Ongoing, Archived.

## Specimen gallery

`specimenBlocks`: `{ id, imageKey, caption, applicationLabel, sortOrder }`.
