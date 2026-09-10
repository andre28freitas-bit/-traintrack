# TrainTrack — Production MVP

PWA para Personal Trainers presenciais / ao domicílio.

## Backend atual

Esta build está ligada ao projeto Supabase partilhado existente, mas usa exclusivamente tabelas dedicadas:

- `traintrack_profiles`
- `traintrack_students`
- `traintrack_test_definitions`
- `traintrack_assessments`
- `traintrack_workouts`
- `traintrack_events`

As tabelas do salão (`salons`, `clients`, `appointments`, etc.) não são usadas pela TrainTrack. Todas as tabelas TrainTrack têm RLS e ownership por `auth.uid()`.

## Funcionalidades

- conta/login Supabase
- alunos e contactos
- idade automática e aniversários
- email e WhatsApp diretos
- frequência e lembrete de reavaliação por aluno
- agenda
- avaliações físicas em matriz por data
- testes de força/cardio/etc. e valor ideal
- registo de treinos
- progressão visual
- estrutura preparada para scores futuros
- PWA instalável

## Deployment

É uma aplicação estática: publicar a raiz do repositório em HTTPS. O ficheiro `config.js` já contém apenas o Project URL e a publishable key, próprios para cliente web. Nunca adicionar uma `service_role`/secret key ao frontend.

## Scores

Os campos de score existem, mas a classificação permanece desligada até serem definidas as fórmulas/standards reais.

## Base de dados

`supabase/schema.sql` documenta a migration de isolamento. A migration já foi aplicada no projeto atual.
