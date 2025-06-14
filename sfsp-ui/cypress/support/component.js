import './commands'
import '../../app/globals.css';
import { mount } from 'cypress/react'

Cypress.Commands.add('mount', mount)
