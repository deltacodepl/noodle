import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import type { DefaultSession, NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getServerSession as $getServerSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Github from 'next-auth/providers/github';

import { prisma } from '@noodle/db';
import { env } from '@noodle/env';

declare module 'next-auth' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Session extends DefaultSession {
    user?: {
      id: string;
    } & DefaultSession['user'];
  }
}

export const authOptions: NextAuthOptions = {
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      const data = await prisma.waitingList.findUnique({
        where: { email: user.email ?? '' },
      });

      if (!data) {
        throw new Error('Not approved');
      }

      if (data.approved) {
        return true;
      }

      throw new Error('Not approved');
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    process.env['VERCEL_ENV'] === 'preview'
      ? Credentials({
          name: 'Credentials',
          credentials: {
            username: {
              label: 'Username',
              type: 'text',
              placeholder: 'jsmith',
            },
            password: { label: 'Password', type: 'password' },
          },
          authorize() {
            return {
              id: '1',
              name: 'John Doe',
              email: 'jdoe@example.com',
              image: 'https://i.pravatar.cc/150?u=jsmith@example.com',
            };
          },
        })
      : Github({
          clientId: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
        }),
  ],
};

type GetServerSessionContext =
  | {
      req: GetServerSidePropsContext['req'];
      res: GetServerSidePropsContext['res'];
    }
  | { req: NextApiRequest; res: NextApiResponse };
export const getServerSession = (ctx: GetServerSessionContext) => {
  return $getServerSession(ctx.req, ctx.res, authOptions);
};

export type { Session } from 'next-auth';
