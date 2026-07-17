Spec for Qually

## Overview

The goal is to implement Qually, a WCAG2.1AA compliant qualitative coding tool like NVivo or Dedoose. The tool should be hosted on GitHub pages, be WCAG2.1AA compliant, and support qualitative coding of video data or interview transcripts using methodologies like open, axial coding, and affinity diagramming in a screen-reader friendly way. Personally identifiable information should never leave a user’s browser.

## Tool features

- A user should be able to upload study data as (1) a video plus a transcrypt file such as VTT, or (2) just a video transcrypt in plaintext or a timestamped format like SRT or VTT.  
- Once a user uploads the data, they should be able to click on specific segments to add codes, or modify codes that are added. The Screen Reader should announce to the user if there are specific codes for a transcrypt segment when they select it. For example, the label should be “Emotion:positive, feature:new feature request, 00:00:12 I want a new button here, that would really improve the feature” for a snippet that has a level 1 code of emotion, a level 2 code of positive, level 1 code of feature, level 2 code of new feature request. No need to announce that there are no codes if none are assigned to that snippet.  
- The transcrypt view should resemble features found on video players that let you seak to specific timestamps of the video by clicking on a transcrypt. Consider implementing it as a listview that is keyboard navigable in focus mode of a screen reader.  
- The tool should also support coloring, just like current tools, so that a sighted teammate who does not use a screen reader can follow along. Color information should be announceable to a screen reader user if they toggle a setting.  
- Once a user selects a snippet, they should be able to go to the codes view to create, assign, unassign, or delete codes. Clearly mark this region up as a heading, and the code hierarchy should use an accessible HTML treeview.  
- Each level 1 and 2 code could have the options to edit and delete if it is possible to make it accessible.  
- Come up with keyboard shortcuts, pressing the question mark to list keyboard shortcuts.

## Technical considerations

- The tool should be WCAG2.1AA compliant, look beautiful, with a minimalist design.  
- The tool should be keyboard navigable, and should support good keyboard shortcuts.  
- Data should never be stored in the website, to meet human subjects data protection rules.  
- Use standard formats as much as possible, so that import-export functionality, or other features can be added at later time.  
- You must use ARIA only when you need it.

## Development guidelines

- You must always make sure that features that are implemented are accessible. Have comprehensive Axe tests, and visually verify if needed.  
- If my specification or request is not clear at any time, you must ask clarification questions instead of assuming.  
- Go with a clean implementation with clear separation of concerns.

## Details that are not clearly specified

These are some details worth nailing down before you start implementing. Ask for more clarifications if other details are not clear.

- List a set of candidate keyboard shortcuts to start.  
- If the tool needs to be hosted on GitHub pages, is there a way to persist data across sessions, or can the tool not support any memory? In other words, would the user loose data after each session?  
- Present a table or clear list of the different controls that you will use for each functionality.