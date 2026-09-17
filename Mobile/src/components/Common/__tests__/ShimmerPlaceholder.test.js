import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  ShimmerPlaceholder,
  CardSkeleton,
  ListSkeleton,
  DetailSkeleton,
  DashboardSkeleton,
  ChatThreadSkeleton,
  ConversationItemSkeleton,
  ConversationListSkeleton,
  ReviewItemSkeleton,
  ReviewListSkeleton,
  ScreenShimmer,
} from '../ShimmerPlaceholder';
import LoadingScreen from '../LoadingScreen';

describe('ShimmerPlaceholder Component & Skeletons', () => {
  it('renders ShimmerPlaceholder with default and custom styles', () => {
    const { getByTestId } = render(
      <ShimmerPlaceholder
        width={150}
        height={24}
        borderRadius={8}
        testID="custom-shimmer"
      />
    );

    const placeholder = getByTestId('custom-shimmer');
    expect(placeholder).toBeTruthy();
    expect(placeholder.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 150,
          height: 24,
          borderRadius: 8,
          backgroundColor: '#E2E8F0',
        }),
      ])
    );
  });

  it('renders CardSkeleton with thumbnail, text, and footer elements', () => {
    const { getByTestId } = render(<CardSkeleton testID="test-card-skeleton" />);

    expect(getByTestId('test-card-skeleton')).toBeTruthy();
    expect(getByTestId('test-card-skeleton-thumb')).toBeTruthy();
    expect(getByTestId('test-card-skeleton-title')).toBeTruthy();
    expect(getByTestId('test-card-skeleton-subtitle')).toBeTruthy();
  });

  it('renders ListSkeleton with specified count of items', () => {
    const { getByTestId } = render(<ListSkeleton count={4} testID="test-list-skeleton" />);

    expect(getByTestId('test-list-skeleton')).toBeTruthy();
    expect(getByTestId('skeleton-card-0')).toBeTruthy();
    expect(getByTestId('skeleton-card-1')).toBeTruthy();
    expect(getByTestId('skeleton-card-2')).toBeTruthy();
    expect(getByTestId('skeleton-card-3')).toBeTruthy();
  });

  it('renders DetailSkeleton with hero, headers, and content areas', () => {
    const { getByTestId } = render(<DetailSkeleton testID="test-detail-skeleton" />);

    expect(getByTestId('test-detail-skeleton')).toBeTruthy();
    expect(getByTestId('test-detail-skeleton-hero')).toBeTruthy();
  });

  it('renders DashboardSkeleton with header and KPI grid', () => {
    const { getByTestId } = render(<DashboardSkeleton testID="test-dashboard-skeleton" />);

    expect(getByTestId('test-dashboard-skeleton')).toBeTruthy();
  });

  it('renders ScreenShimmer conditionally based on loading prop', () => {
    const { getByTestId, queryByText, rerender } = render(
      <ScreenShimmer loading={true} type="list" count={2} testID="screen-shimmer">
        <Text>Loaded Content</Text>
      </ScreenShimmer>
    );

    expect(getByTestId('screen-shimmer')).toBeTruthy();
    expect(queryByText('Loaded Content')).toBeNull();

    rerender(
      <ScreenShimmer loading={false} type="list" testID="screen-shimmer">
        <Text>Loaded Content</Text>
      </ScreenShimmer>
    );

    expect(queryByText('Loaded Content')).toBeTruthy();
  });

  it('renders LoadingScreen with message and shimmer animation', () => {
    const { getByTestId, getByText } = render(
      <LoadingScreen message="Fetching parking data..." type="list" testID="app-loading-screen" />
    );

    expect(getByTestId('app-loading-screen')).toBeTruthy();
    expect(getByText('Fetching parking data...')).toBeTruthy();
    expect(getByTestId('loading-shimmer')).toBeTruthy();
  });

  it('renders ChatThreadSkeleton with date divider, avatars, and message bubbles', () => {
    const { getByTestId } = render(<ChatThreadSkeleton testID="test-chat-thread" />);

    expect(getByTestId('test-chat-thread')).toBeTruthy();
    expect(getByTestId('test-chat-thread-date')).toBeTruthy();
    expect(getByTestId('test-chat-thread-avatar-0')).toBeTruthy();
    expect(getByTestId('test-chat-thread-avatar-1')).toBeTruthy();
    expect(getByTestId('test-chat-thread-avatar-2')).toBeTruthy();
  });

  it('renders ConversationListSkeleton with rows of avatar, header, and preview bars', () => {
    const { getByTestId } = render(<ConversationListSkeleton count={3} testID="test-conv-list" />);

    expect(getByTestId('test-conv-list')).toBeTruthy();
    expect(getByTestId('conv-item-0-avatar')).toBeTruthy();
    expect(getByTestId('conv-item-0-name')).toBeTruthy();
    expect(getByTestId('conv-item-0-preview')).toBeTruthy();
    expect(getByTestId('conv-item-1-avatar')).toBeTruthy();
    expect(getByTestId('conv-item-2-avatar')).toBeTruthy();
  });

  it('renders ReviewListSkeleton with reviewer avatars and star placeholders', () => {
    const { getByTestId } = render(<ReviewListSkeleton count={2} testID="test-review-list" />);

    expect(getByTestId('test-review-list')).toBeTruthy();
    expect(getByTestId('review-item-0-avatar')).toBeTruthy();
    expect(getByTestId('review-item-0-name')).toBeTruthy();
    expect(getByTestId('review-item-0-stars')).toBeTruthy();
    expect(getByTestId('review-item-1-avatar')).toBeTruthy();
  });

  it('renders ScreenShimmer with chat, conversation, and review types', () => {
    const { getByTestId, rerender } = render(
      <ScreenShimmer loading={true} type="chat" testID="chat-shimmer" />
    );
    expect(getByTestId('chat-shimmer')).toBeTruthy();

    rerender(<ScreenShimmer loading={true} type="conversation" testID="conv-shimmer" />);
    expect(getByTestId('conv-shimmer')).toBeTruthy();

    rerender(<ScreenShimmer loading={true} type="review" testID="review-shimmer" />);
    expect(getByTestId('review-shimmer')).toBeTruthy();
  });
});
