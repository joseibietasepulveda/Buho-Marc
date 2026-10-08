CREATE TABLE release_acknowledgements (
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 version varchar(80) NOT NULL,
 news_accepted boolean DEFAULT false NOT NULL,
 future_accepted boolean DEFAULT false NOT NULL,
 updated_at timestamptz DEFAULT now() NOT NULL,
 PRIMARY KEY (organization_id,user_id,version),
 CHECK (NOT future_accepted OR news_accepted)
);
